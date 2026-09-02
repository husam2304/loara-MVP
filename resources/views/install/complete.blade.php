@php($current = 4)
@extends('install.layout')
@section('step', 'Done')
@section('content')
    <h2>Installation complete 🎉</h2>
    <p class="muted" style="margin-bottom:20px">
        Loara is installed and ready. The installer is now locked. To run it again,
        delete <code>storage/installed</code>.
    </p>
    <p class="muted" style="margin-bottom:20px">
        Next steps: log in as your admin, then add your Vapi, Stripe, and (optionally)
        Claim.MD credentials in the platform settings or your <code>.env</code> file.
    </p>
    <a href="{{ url('/login') }}" class="btn">Go to login</a>
@endsection
