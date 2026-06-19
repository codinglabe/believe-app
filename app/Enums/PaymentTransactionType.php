<?php

namespace App\Enums;

enum PaymentTransactionType: string
{
    case Donation = 'donation';
    case BelievePointsPurchase = 'believe_points_purchase';
}
