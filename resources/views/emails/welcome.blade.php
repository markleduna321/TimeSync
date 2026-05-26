<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Welcome to TimeSync</title>
    <!--[if mso]>
    <noscript>
        <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    </noscript>
    <![endif]-->
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
        .wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 16px; }
        .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 40px 32px; text-align: center; }
        .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background-color: rgba(255,255,255,0.18); border-radius: 14px; margin-bottom: 16px; }
        .logo-icon svg { width: 30px; height: 30px; }
        .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
        .header p { color: rgba(255,255,255,0.75); font-size: 14px; margin-top: 4px; }
        .body { padding: 40px; }
        .greeting { font-size: 17px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
        .intro { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 28px; }
        .credentials-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 28px; }
        .credentials-box .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; margin-bottom: 4px; }
        .credentials-box .value { font-size: 15px; font-weight: 500; color: #1e293b; word-break: break-all; }
        .credentials-box .divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
        .credentials-box .password-value { font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 700; color: #4f46e5; letter-spacing: 0.5px; }
        .notice { display: flex; gap: 12px; align-items: flex-start; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin-bottom: 28px; }
        .notice-icon { flex-shrink: 0; margin-top: 1px; }
        .notice p { font-size: 13px; color: #92400e; line-height: 1.6; }
        .btn-wrap { text-align: center; margin-bottom: 32px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 32px; border-radius: 10px; letter-spacing: 0.2px; }
        .footer { border-top: 1px solid #f1f5f9; padding: 24px 40px; text-align: center; }
        .footer p { font-size: 12px; color: #94a3b8; line-height: 1.6; }
        .footer a { color: #6366f1; text-decoration: none; }
        @media (max-width: 600px) {
            .body { padding: 28px 24px; }
            .header { padding: 32px 24px 24px; }
            .footer { padding: 20px 24px; }
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="container">

        <!-- Header -->
        <div class="header">
            <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2"/>
                    <path d="M12 7v5l3 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1>TimeSync</h1>
            <p>Workforce Management Platform</p>
        </div>

        <!-- Body -->
        <div class="body">
            <p class="greeting">👋 Welcome, {{ $user->first_name }}!</p>
            <p class="intro">
                Your TimeSync account has been created by your administrator.
                Use the credentials below to sign in for the first time.
                You will be asked to set a new password immediately after logging in.
            </p>

            <!-- Credentials -->
            <div class="credentials-box">
                <p class="label">Login Email</p>
                <p class="value">{{ $user->email }}</p>
                <hr class="divider" />
                <p class="label">Temporary Password</p>
                <p class="password-value">{{ $plainPassword }}</p>
            </div>

            <!-- Warning notice -->
            <div class="notice">
                <div class="notice-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <p>For your security, please change your password immediately after your first login. Do not share these credentials with anyone.</p>
            </div>

            <!-- CTA -->
            <div class="btn-wrap">
                <a href="{{ config('app.url') }}/login" class="btn">Sign In to TimeSync →</a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>
                This is an automated message — please do not reply to this email.<br />
                If you did not expect this account, please contact your administrator.<br /><br />
                &copy; {{ date('Y') }} TimeSync &nbsp;·&nbsp; All rights reserved.
            </p>
        </div>

    </div>
</div>
</body>
</html>
