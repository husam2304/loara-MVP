@php($current = 3)
@extends('install.layout')
@section('step', 'Admin')
@section('content')
    <h2>Create your admin account</h2>
    <p class="muted" style="margin-bottom:16px">This creates the SuperAdmin who manages the platform. Migrations run when you submit this step.</p>
    <form method="POST" action="{{ route('install.admin.save') }}">
        @csrf
        <label>Full name</label>
        <input type="text" name="name" value="{{ old('name') }}" required>

        <label>Email</label>
        <input type="email" name="email" value="{{ old('email') }}" required>

        <label>Password</label>
        <input type="password" name="password" required>

        <label>Confirm password</label>
        <input type="password" name="password_confirmation" required>

        <div class="checkbox">
            <input type="checkbox" name="seed_demo" value="1" id="seed_demo" checked>
            <label for="seed_demo" style="margin:0">Load demo data (recommended for first look)</label>
        </div>

        <button type="submit" class="btn">Run installation</button>
    </form>
@endsection
