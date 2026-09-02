<?php

use App\Jobs\DownloadCallRecording;
use App\Models\CallRecording;
use App\Services\CallService;
use App\Services\Voice\VoiceConfigurationResolver;

test('it unwraps nested model arrays before creating resolved voice config', function () {
    $resolved = (new VoiceConfigurationResolver)->resolve([
        'language' => 'en',
        'model' => [
            'provider' => 'openai',
            'model' => 'gpt-4o-mini',
        ],
        'voice_provider' => 'vapi',
        'voice_name' => 'Elliot',
    ]);

    expect($resolved->model)->toBe('gpt-4o-mini')
        ->and($resolved->modelProvider)->toBe('openai')
        ->and($resolved->voiceProvider)->toBe('vapi')
        ->and($resolved->voiceName)->toBe('Elliot');
});

test('it resolves the call service class when refreshing a recording url', function () {
    $recording = new CallRecording([
        'id' => 123,
        'call_id' => 'call_123',
    ]);

    $service = Mockery::mock(CallService::class);
    $service->shouldReceive('refreshRecordingUrl')->once()->with($recording)->andReturn('https://example.com/recording.mp3');

    app()->instance(CallService::class, $service);

    $job = new class extends DownloadCallRecording
    {
        public function __construct() {}
    };

    expect($job->refreshRecordingUrl($recording))->toBe('https://example.com/recording.mp3');
});
