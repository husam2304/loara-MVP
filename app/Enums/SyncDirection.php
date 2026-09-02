<?php

namespace App\Enums;

enum SyncDirection: string
{
    case Push = 'push';
    case Pull = 'pull';
}
