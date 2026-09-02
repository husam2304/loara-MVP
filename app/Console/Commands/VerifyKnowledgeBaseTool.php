<?php

namespace App\Console\Commands;

use App\Models\AiConfiguration;
use App\Models\KnowledgeBaseFile;
use App\Services\VapiService;
use Illuminate\Console\Command;

class VerifyKnowledgeBaseTool extends Command
{
    protected $signature = 'vapi:verify-kb-tool {--clinic-id=}';

    protected $description = 'Verify the knowledge-base tool definition and files in Vapi';

    public function handle(): void
    {
        $clinicId = $this->option('clinic-id');

        if (! $clinicId) {
            $this->error('Please provide a clinic ID: --clinic-id=1');

            return;
        }

        $config = AiConfiguration::where('clinic_id', $clinicId)->first();

        if (! $config) {
            $this->error("No AI configuration found for clinic {$clinicId}");

            return;
        }

        if (! $config->vapi_knowledge_base_tool_id) {
            $this->error("No knowledge-base tool ID configured for clinic {$clinicId}");

            return;
        }

        $toolId = $config->vapi_knowledge_base_tool_id;
        $this->info("Verifying knowledge-base tool {$toolId}...\n");

        try {
            $vapi = app(VapiService::class);

            // Get the tool definition
            $tool = $vapi->getTool($toolId);

            $this->info('Tool Definition:');
            $this->line('  Type: '.($tool['type'] ?? 'N/A'));
            $this->line('  Name: '.($tool['function']['name'] ?? 'N/A'));
            $this->line('  Description: '.($tool['function']['description'] ?? 'N/A'));
            $this->newLine();

            // Check knowledge bases
            $knowledgeBases = $tool['knowledgeBases'] ?? [];
            $this->info('Knowledge Bases:');
            if (empty($knowledgeBases)) {
                $this->error('  ❌ NO KNOWLEDGE BASES');
            } else {
                foreach ($knowledgeBases as $kb) {
                    $this->line('  Name: '.($kb['name'] ?? 'N/A'));
                    $this->line('  Provider: '.($kb['provider'] ?? 'N/A'));

                    $fileIds = $kb['fileIds'] ?? [];
                    $this->line('  File IDs ('.count($fileIds).'):');
                    if (empty($fileIds)) {
                        $this->warn('    ❌ NO FILES ATTACHED');
                    } else {
                        foreach ($fileIds as $fileId) {
                            $this->line("    ✓ {$fileId}");
                        }
                    }
                }
            }
            $this->newLine();

            // Check local files
            $this->info('Local Knowledge-Base Files:');
            $localFiles = KnowledgeBaseFile::where('clinic_id', $clinicId)->get();
            if ($localFiles->isEmpty()) {
                $this->warn('  ❌ NO FILES UPLOADED');
            } else {
                foreach ($localFiles as $file) {
                    $this->line("  ✓ {$file->original_name}");
                    $this->line("    Vapi ID: {$file->vapi_file_id}");
                    $this->line('    Size: '.$this->formatBytes($file->file_size));
                    $this->line("    Type: {$file->mime_type}");
                }
            }
            $this->newLine();

            // Summary
            $hasKBs = ! empty($knowledgeBases);
            $hasFiles = $localFiles->count() > 0;
            $kbHasFiles = false;
            if ($hasKBs) {
                foreach ($knowledgeBases as $kb) {
                    if (! empty($kb['fileIds'])) {
                        $kbHasFiles = true;
                        break;
                    }
                }
            }

            $this->info('Summary:');
            $this->line('  Has Knowledge Bases: '.($hasKBs ? '✓' : '❌'));
            $this->line('  KB has Files: '.($kbHasFiles ? '✓' : '❌'));
            $this->line('  Local Files: '.($hasFiles ? $localFiles->count().' uploaded' : '❌ none'));

            if (! $kbHasFiles) {
                $this->newLine();
                $this->error('⚠️  ISSUE DETECTED: Knowledge base tool exists but has no files!');
                $this->line('Upload files via Settings → Knowledge Base to attach them to this tool.');
            }

        } catch (\Throwable $e) {
            $this->error('Error verifying tool: '.$e->getMessage());
            $this->error($e->getTraceAsString());
        }
    }

    private function formatBytes($bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2).' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 2).' KB';
        }

        return $bytes.' B';
    }
}
