"""
Celora Email Service
Handles all transactional emails using Resend API
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Check if Resend is available
RESEND_AVAILABLE = False
resend = None

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    logger.warning("Resend package not installed. Email functionality disabled.")

# Configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@getcelora.com")
SENDER_NAME = os.environ.get("SENDER_NAME", "Celora")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.getcelora.com")

# Initialize Resend
if RESEND_AVAILABLE and RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service initialized")
else:
    logger.warning("Resend API key not configured. Emails will be logged but not sent.")


def is_email_configured() -> bool:
    """Check if email service is properly configured"""
    return RESEND_AVAILABLE and bool(RESEND_API_KEY)


# ==================== EMAIL TEMPLATES ====================

def get_base_template(content: str, preview_text: str = "") -> str:
    """Base email template with Celora branding"""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Celora</title>
    <!--[if !mso]><!-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
    <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Preview Text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {preview_text}
    </div>
    
    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #06b6d4;">Celora</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            {content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                                © {datetime.now().year} Celora. All rights reserved.<br>
                                <a href="{FRONTEND_URL}" style="color: #06b6d4; text-decoration: none;">www.getcelora.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def welcome_email_template(store_name: str, owner_name: str, subdomain: str) -> Dict[str, str]:
    """Welcome email for new store owners"""
    content = f"""
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
            Welcome to Celora! 🎉
        </h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Hi {owner_name},
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Congratulations! Your store <strong style="color: #18181b;">{store_name}</strong> is now live and ready for business.
        </p>
        
        <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #0d9488; font-weight: 500;">Your Store URL</p>
            <p style="margin: 0; font-size: 18px; color: #0f766e; font-weight: 600;">
                <a href="https://{subdomain}.getcelora.com" style="color: #0f766e; text-decoration: none;">
                    {subdomain}.getcelora.com
                </a>
            </p>
        </div>
        
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Here's what you can do next:
        </p>
        
        <ul style="margin: 0 0 24px; padding-left: 24px; font-size: 16px; color: #3f3f46; line-height: 1.8;">
            <li>Add your first products</li>
            <li>Customize your store theme</li>
            <li>Set up payment methods</li>
            <li>Connect your own domain</li>
        </ul>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
            <tr>
                <td style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #3b82f6);">
                    <a href="{FRONTEND_URL}/merchant" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Go to Dashboard →
                    </a>
                </td>
            </tr>
        </table>
        
        <p style="margin: 0; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Need help? Reply to this email or check our <a href="{FRONTEND_URL}/help" style="color: #06b6d4; text-decoration: none;">Help Center</a>.
        </p>
    """
    
    return {
        "subject": f"Welcome to Celora! Your store {store_name} is live 🚀",
        "html": get_base_template(content, f"Your store {store_name} is now live on Celora!")
    }


def password_reset_email_template(name: str, reset_link: str) -> Dict[str, str]:
    """Password reset email"""
    content = f"""
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
            Reset Your Password
        </h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Hi {name},
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
        </p>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
            <tr>
                <td style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #3b82f6);">
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Reset Password
                    </a>
                </td>
            </tr>
        </table>
        
        <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
            This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="margin: 0 0 24px; font-size: 14px; color: #71717a; line-height: 1.6;">
            If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.
        </p>
        
        <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; margin-top: 24px;">
            <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Can't click the button? Copy and paste this link into your browser:<br>
                <a href="{reset_link}" style="color: #06b6d4; word-break: break-all;">{reset_link}</a>
            </p>
        </div>
    """
    
    return {
        "subject": "Reset your Celora password",
        "html": get_base_template(content, "Reset your password to access your Celora account")
    }


def order_confirmation_email_template(
    customer_name: str,
    order_number: str,
    order_items: list,
    total: float,
    shipping_address: str,
    store_name: str
) -> Dict[str, str]:
    """Order confirmation email"""
    
    # Build items table
    items_html = ""
    for item in order_items:
        items_html += f"""
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <p style="margin: 0; font-size: 14px; color: #18181b; font-weight: 500;">{item.get('name', 'Product')}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #71717a;">Qty: {item.get('quantity', 1)}</p>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                    <p style="margin: 0; font-size: 14px; color: #18181b;">${item.get('price', 0):.2f}</p>
                </td>
            </tr>
        """
    
    content = f"""
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
            Order Confirmed! ✓
        </h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Hi {customer_name},
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Thank you for your order from <strong>{store_name}</strong>! We've received your order and it's being processed.
        </p>
        
        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #71717a;">Order Number</p>
            <p style="margin: 4px 0 0; font-size: 20px; color: #18181b; font-weight: 600;">#{order_number}</p>
        </div>
        
        <h3 style="margin: 24px 0 16px; font-size: 16px; font-weight: 600; color: #18181b;">Order Summary</h3>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            {items_html}
            <tr>
                <td style="padding: 16px 0 0;">
                    <p style="margin: 0; font-size: 16px; color: #18181b; font-weight: 600;">Total</p>
                </td>
                <td style="padding: 16px 0 0; text-align: right;">
                    <p style="margin: 0; font-size: 18px; color: #18181b; font-weight: 700;">${total:.2f}</p>
                </td>
            </tr>
        </table>
        
        <h3 style="margin: 32px 0 16px; font-size: 16px; font-weight: 600; color: #18181b;">Shipping Address</h3>
        <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6; white-space: pre-line;">{shipping_address}</p>
        
        <p style="margin: 32px 0 0; font-size: 14px; color: #71717a; line-height: 1.6;">
            We'll send you another email when your order ships with tracking information.
        </p>
    """
    
    return {
        "subject": f"Order Confirmed - #{order_number}",
        "html": get_base_template(content, f"Your order #{order_number} has been confirmed!")
    }


def shipping_notification_email_template(
    customer_name: str,
    order_number: str,
    tracking_number: str,
    tracking_url: str,
    carrier: str,
    store_name: str
) -> Dict[str, str]:
    """Shipping notification email"""
    content = f"""
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
            Your Order Has Shipped! 📦
        </h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Hi {customer_name},
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Great news! Your order from <strong>{store_name}</strong> is on its way.
        </p>
        
        <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #0d9488; font-weight: 500;">Tracking Number</p>
            <p style="margin: 0 0 16px; font-size: 18px; color: #0f766e; font-weight: 600;">{tracking_number}</p>
            <p style="margin: 0; font-size: 14px; color: #71717a;">Carrier: {carrier}</p>
        </div>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
            <tr>
                <td style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #3b82f6);">
                    <a href="{tracking_url}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Track Your Package →
                    </a>
                </td>
            </tr>
        </table>
        
        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #71717a;">Order Number</p>
            <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 600;">#{order_number}</p>
        </div>
    """
    
    return {
        "subject": f"Your order #{order_number} has shipped!",
        "html": get_base_template(content, f"Your order is on its way! Track it now.")
    }


def domain_verified_email_template(
    owner_name: str,
    store_name: str,
    custom_domain: str
) -> Dict[str, str]:
    """Domain verification success email"""
    content = f"""
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
            Domain Connected Successfully! 🎉
        </h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Hi {owner_name},
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            Great news! Your custom domain has been verified and is now live.
        </p>
        
        <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #0d9488; font-weight: 500;">Your Store is Now Live At</p>
            <p style="margin: 0; font-size: 20px; color: #0f766e; font-weight: 600;">
                <a href="https://{custom_domain}" style="color: #0f766e; text-decoration: none;">
                    {custom_domain}
                </a>
            </p>
        </div>
        
        <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
            SSL certificate has been automatically provisioned. Your customers can now securely shop at your custom domain.
        </p>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
            <tr>
                <td style="border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #3b82f6);">
                    <a href="https://{custom_domain}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Visit Your Store →
                    </a>
                </td>
            </tr>
        </table>
    """
    
    return {
        "subject": f"Your domain {custom_domain} is now live!",
        "html": get_base_template(content, f"Your custom domain {custom_domain} is now connected!")
    }


# ==================== SEND FUNCTIONS ====================

async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    from_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send an email using Resend API
    
    Returns:
        dict with 'success', 'message', and optionally 'email_id'
    """
    if not is_email_configured():
        logger.info(f"[EMAIL MOCK] To: {to_email}, Subject: {subject}")
        return {
            "success": True,
            "message": "Email logged (Resend not configured)",
            "mocked": True
        }
    
    sender = f"{from_name or SENDER_NAME} <{SENDER_EMAIL}>"
    
    params = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {subject}")
        return {
            "success": True,
            "message": f"Email sent to {to_email}",
            "email_id": email_response.get("id") if isinstance(email_response, dict) else str(email_response)
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to send email: {str(e)}"
        }


async def send_welcome_email(
    to_email: str,
    store_name: str,
    owner_name: str,
    subdomain: str
) -> Dict[str, Any]:
    """Send welcome email to new store owner"""
    template = welcome_email_template(store_name, owner_name, subdomain)
    return await send_email(to_email, template["subject"], template["html"])


async def send_password_reset_email(
    to_email: str,
    name: str,
    reset_token: str
) -> Dict[str, Any]:
    """Send password reset email"""
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    template = password_reset_email_template(name, reset_link)
    return await send_email(to_email, template["subject"], template["html"])


async def send_order_confirmation_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    order_items: list,
    total: float,
    shipping_address: str,
    store_name: str
) -> Dict[str, Any]:
    """Send order confirmation email"""
    template = order_confirmation_email_template(
        customer_name, order_number, order_items, total, shipping_address, store_name
    )
    return await send_email(to_email, template["subject"], template["html"], store_name)


async def send_shipping_notification_email(
    to_email: str,
    customer_name: str,
    order_number: str,
    tracking_number: str,
    tracking_url: str,
    carrier: str,
    store_name: str
) -> Dict[str, Any]:
    """Send shipping notification email"""
    template = shipping_notification_email_template(
        customer_name, order_number, tracking_number, tracking_url, carrier, store_name
    )
    return await send_email(to_email, template["subject"], template["html"], store_name)


async def send_domain_verified_email(
    to_email: str,
    owner_name: str,
    store_name: str,
    custom_domain: str
) -> Dict[str, Any]:
    """Send domain verification success email"""
    template = domain_verified_email_template(owner_name, store_name, custom_domain)
    return await send_email(to_email, template["subject"], template["html"])
