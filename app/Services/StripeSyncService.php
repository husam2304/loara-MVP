<?php

namespace App\Services;

use Stripe\Price as StripePrice;
use Stripe\Product as StripeProduct;
use Stripe\Stripe;

class StripeSyncService
{
    public function setApiKey(string $key): void
    {
        Stripe::setApiKey($key);
    }

    public function createProduct(array $params): object
    {
        return StripeProduct::create($params);
    }

    public function updateProduct(string $id, array $params): object
    {
        return StripeProduct::update($id, $params);
    }

    public function createPrice(array $params): object
    {
        return StripePrice::create($params);
    }

    public function retrievePrice(string $id): object
    {
        return StripePrice::retrieve($id);
    }

    public function deactivatePrice(string $id): void
    {
        StripePrice::update($id, ['active' => false]);
    }
}
