import React from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import HeroPanel from './_sections/HeroPanel';
import LoginForm from './_sections/LoginForm';

export default function LoginPage({ status, canResetPassword }) {
    return (
        <div className="flex min-h-screen">
            <HeroPanel />
            <LoginForm status={status} canResetPassword={canResetPassword} />
        </div>
    );
}

LoginPage.layout = (page) => <GuestLayout>{page}</GuestLayout>;
