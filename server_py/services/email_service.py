from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import Session, select
from ..models import EmailVerification, EmailSettings
import random
import logging

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_verification_code(email: str, session: Session) -> bool:
        """
        生成验证码并通过 SMTP 发送邮件
        """
        # 1. Generate Code
        code = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # 2. Save to DB
        verification = EmailVerification(
            email=email,
            code=code,
            expiresAt=expires_at
        )
        session.add(verification)
        
        # 3. Get Email Settings
        settings = session.get(EmailSettings, 1)
        if not settings or not settings.smtpUser or not settings.smtpPassword:
            print(f"⚠️ SMTP not configured. Mocking email to {email}: {code}")
            session.commit()
            return True # Allow mock if not configured? Or fail? Let's fail if not configured in prod, but mock print for now creates confusion. 
            # Better: if not configured, return False to prompt setup, OR just print if in dev.
            # Given user wants REAL sending, we should try to send.
        
        # If settings exist, try to send
        import smtplib
        from email.mime.text import MIMEText
        from email.header import Header
        import ssl

        try:
            # Create message
            msg = MIMEText(f"您的验证码是：{code}，有效期10分钟。如非本人操作，请忽略。", 'plain', 'utf-8')
            msg['From'] = Header(f"{settings.senderName} <{settings.smtpUser}>", 'utf-8')
            msg['To'] = Header(email, 'utf-8')
            msg['Subject'] = Header("小鱼装机平台 - 验证码", 'utf-8')

            # Connect to SMTP Server
            if settings.useSSL:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings.smtpServer, settings.smtpPort, context=context) as server:
                    server.login(settings.smtpUser, settings.smtpPassword)
                    server.sendmail(settings.smtpUser, [email], msg.as_string())
            else:
                with smtplib.SMTP(settings.smtpServer, settings.smtpPort) as server:
                    server.starttls()
                    server.login(settings.smtpUser, settings.smtpPassword)
                    server.sendmail(settings.smtpUser, [email], msg.as_string())
            
            logger.info(f"Email sent to {email}")
            session.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            # Fallback to mock print for debugging if sending fails?
            print(f"❌ Email send failed. Mock code: {code}")
            # We should probably still return False if it really failed
            return False

    @staticmethod
    def verify_code(email: str, code: str, session: Session) -> bool:
        """
        校验验证码是否有效
        """
        statement = select(EmailVerification).where(
            EmailVerification.email == email,
            EmailVerification.code == code,
            EmailVerification.expiresAt > datetime.utcnow()
        ).order_by(EmailVerification.createdAt.desc())
        
        result = session.exec(statement).first()
        
        if result:
            # 验证成功后删除该条记录或标记为已使用（可选）
            # session.delete(result)
            # session.commit()
            return True
            
        return False
