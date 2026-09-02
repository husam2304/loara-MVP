<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Provider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $clinic = $request->user()->clinic;
        $query = $request->input('q');

        if (! $clinic) {
            return response()->json(['results' => []]);
        }

        $patients = Patient::where('clinic_id', $clinic->id)
            ->where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                    ->orWhere('last_name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%");
            })
            ->select('id', 'first_name', 'last_name', 'phone', 'status')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'type' => 'patient',
                'title' => "{$p->first_name} {$p->last_name}",
                'subtitle' => $p->phone,
                'url' => "/patients/{$p->id}",
                'status' => $p->status,
            ]);

        $providers = Provider::where('clinic_id', $clinic->id)
            ->where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                    ->orWhere('last_name', 'like', "%{$query}%")
                    ->orWhere('specialty', 'like', "%{$query}%")
                    ->orWhere('npi_number', 'like', "%{$query}%");
            })
            ->select('id', 'first_name', 'last_name', 'title', 'specialty', 'color', 'is_active')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'type' => 'provider',
                'title' => "{$p->title} {$p->first_name} {$p->last_name}",
                'subtitle' => $p->specialty,
                'url' => '/providers',
                'color' => $p->color,
                'is_active' => $p->is_active,
            ]);

        $appointments = Appointment::where('clinic_id', $clinic->id)
            ->whereHas('patient', function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                    ->orWhere('last_name', 'like', "%{$query}%");
            })
            ->with(['patient:id,first_name,last_name', 'provider:id,first_name,last_name,title', 'appointmentType:id,name'])
            ->where('scheduled_at', '>=', now()->subDays(30))
            ->latest('scheduled_at')
            ->limit(5)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'type' => 'appointment',
                'title' => $a->patient?->first_name.' '.$a->patient?->last_name,
                'subtitle' => ($a->appointmentType?->name ?? 'Appointment').' - '.$a->scheduled_at->format('M j, g:i A'),
                'url' => '/appointments',
                'status' => $a->status->value,
            ]);

        return response()->json([
            'results' => $patients->concat($providers)->concat($appointments)->values(),
        ]);
    }
}
