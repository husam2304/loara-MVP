<?php

namespace App\Http\Controllers;

use App\Models\Call;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CallRecordingController extends Controller
{
    /**
     * Stream a locally stored call recording to authorised clinic staff.
     * Recordings never leave the backend unauthenticated: the Vapi URL is
     * not exposed, only the downloaded copy is served.
     */
    public function __invoke(Call $call): StreamedResponse
    {
        $clinic = auth()->user()->clinic;

        abort_unless($clinic !== null && $call->clinic_id === $clinic->id, 404);

        $recording = $call->recording;

        abort_unless(
            $recording !== null
            && $recording->file_path !== ''
            && Storage::exists($recording->file_path),
            404,
        );

        return Storage::response($recording->file_path, "call-{$call->id}.{$recording->format}");
    }
}
