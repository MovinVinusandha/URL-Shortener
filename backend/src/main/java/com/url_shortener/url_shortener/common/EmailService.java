package com.url_shortener.url_shortener.common;

import com.url_shortener.url_shortener.users.User;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.dashboard.url:http://localhost:5173}")
    private String dashboardUrl;

    @Value("${spring.mail.username:noreply@trim.com}")
    private String fromEmail;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendVerificationEmail(User user, String rawToken) {
        String verifyUrl = dashboardUrl + "/verify-email?token=" + rawToken;
        String subject = "Verify your email address - Trim";
        String htmlContent = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f172a; margin-bottom: 16px;">Welcome to Trim, %s!</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                        Please click the button below to verify your email address and activate your account.
                    </p>
                    <div style="margin: 28px 0;">
                        <a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">
                        Or copy and paste this link in your browser:<br/>
                        <a href="%s" style="color: #0284c7;">%s</a>
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                        This verification link expires in 24 hours. If you did not create a Trim account, you can safely ignore this email.
                    </p>
                </div>
                """.formatted(user.getUsername(), verifyUrl, verifyUrl, verifyUrl);

        sendEmail(user.getEmail(), subject, htmlContent, "Verification Link", verifyUrl);
    }

    @Async
    public void sendPasswordResetEmail(User user, String rawToken) {
        String resetUrl = dashboardUrl + "/reset-password?token=" + rawToken;
        String subject = "Reset your Trim password";
        String htmlContent = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Request</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                        Hello %s, we received a request to reset your password for your Trim account. Click the button below to set a new password:
                    </p>
                    <div style="margin: 28px 0;">
                        <a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">
                        Or copy and paste this link in your browser:<br/>
                        <a href="%s" style="color: #0284c7;">%s</a>
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                        This link will expire in 30 minutes. If you did not request a password reset, please ignore this email.
                    </p>
                </div>
                """.formatted(user.getUsername(), resetUrl, resetUrl, resetUrl);

        sendEmail(user.getEmail(), subject, htmlContent, "Password Reset Link", resetUrl);
    }

    private void sendEmail(String to, String subject, String htmlContent, String linkLabel, String linkUrl) {
        log.info("\n================================================================================\n" +
                 "📧 [EMAIL NOTIFICATION]\n" +
                 "To: {}\n" +
                 "Subject: {}\n" +
                 "{}: {}\n" +
                 "================================================================================",
                 to, subject, linkLabel, linkUrl);

        if (mailSender == null) {
            log.warn("JavaMailSender is not configured. Email logged to console above.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email successfully dispatched to {}", to);
        } catch (Exception e) {
            log.warn("Could not dispatch email via SMTP (using dev console fallback). Error: {}", e.getMessage());
        }
    }
}
