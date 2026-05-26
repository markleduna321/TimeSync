<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User   $user,
        public readonly string $plainPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from:    new Address(config('mail.from.address'), 'TimeSync — No Reply'),
            subject: 'Welcome to TimeSync — Your Account is Ready',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.welcome',
        );
    }
}
