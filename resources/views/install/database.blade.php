@php($current = 2)
@extends('install.layout')
@section('step', 'Database')
@section('content')
    <h2>Application & database</h2>
    <form method="POST" action="{{ route('install.database.save') }}">
        @csrf
        <label>Application name</label>
        <input type="text" name="app_name" value="{{ old('app_name', $old['app_name'] ?? 'Loara') }}" required>

        <label>Application URL</label>
        <input type="url" name="app_url" value="{{ old('app_url', $old['app_url'] ?? url('/')) }}" required>

        <div class="row">
            <div>
                <label>DB host</label>
                <input type="text" name="db_host" value="{{ old('db_host', $old['db_host'] ?? '127.0.0.1') }}" required>
            </div>
            <div>
                <label>DB port</label>
                <input type="number" name="db_port" value="{{ old('db_port', $old['db_port'] ?? '3306') }}" required>
            </div>
        </div>

        <label>Database name</label>
        <input type="text" name="db_database" value="{{ old('db_database', $old['db_database'] ?? '') }}" required>

        <label>Database username</label>
        <input type="text" name="db_username" value="{{ old('db_username', $old['db_username'] ?? '') }}" required>

        <label>Database password</label>
        <input type="password" name="db_password" value="">

        <button type="submit" class="btn">Test connection & continue</button>
    </form>
@endsection
