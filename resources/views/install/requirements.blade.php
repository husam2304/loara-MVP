@php($current = 1)
@extends('install.layout')
@section('step', 'Requirements')
@section('content')
    <h2>System requirements</h2>
    <div class="check">
        <span>PHP {{ $phpVersion }} (8.2+ required)</span>
        <span class="{{ $phpOk ? 'ok' : 'bad' }}">{{ $phpOk ? 'OK' : 'Upgrade PHP' }}</span>
    </div>
    @foreach ($extensions as $ext => $loaded)
        <div class="check">
            <span>ext-{{ $ext }}</span>
            <span class="{{ $loaded ? 'ok' : 'bad' }}">{{ $loaded ? 'OK' : 'Missing' }}</span>
        </div>
    @endforeach
    @foreach ($paths as $path => $writable)
        <div class="check">
            <span>{{ $path }} writable</span>
            <span class="{{ $writable ? 'ok' : 'bad' }}">{{ $writable ? 'OK' : 'Not writable' }}</span>
        </div>
    @endforeach

    <div style="margin-top:20px">
        @if ($passed)
            <a href="{{ route('install.database') }}" class="btn">Continue</a>
        @else
            <button class="btn" disabled>Resolve the items above to continue</button>
        @endif
    </div>
@endsection
