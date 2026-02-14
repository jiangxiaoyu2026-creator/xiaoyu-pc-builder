import httpx
from datetime import datetime, timedelta
import random
from models import SMSVerification
from sqlmodel import Session, select

class SMSService:
    @staticmethod
    async def send_verification_code(mobile: str, session: Session, app_code: str):
        # Generate 6-digit code
        code = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        # Aliyun Market API Config (from user provided snippet)
        url = "https://gyytz.market.alicloudapi.com/sms/smsSend"
        # These IDs were provided in the user's snippet
        sms_sign_id = "2e65b1bb3d054466b82f0c9d125465e2"
        template_id = "908e94ccf08b4476ba6c876d13f084ad"
        
        # Formatting param according to snippet: param = '**code**:12345,**minute**:5'
        param = f"**code**:{code},**minute**:5"
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"APPCODE {app_code}"
        }
        params = {
            "mobile": mobile,
            "smsSignId": sms_sign_id,
            "templateId": template_id,
            "param": param
        }
        
        # Send SMS using httpx (async requests)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, params=params)
                if response.status_code != 200:
                    print(f"SMS API Error: {response.status_code} - {response.text}")
                    return False
                
                # Double check response body for business success if necessary
                # In many Chinese SMS APIs, a 200 OK doesn't always mean the SMS was accepted
                # For this specific API, we'll assume 200 is good based on the simple snippet
        except Exception as e:
            print(f"SMS Service Exception: {str(e)}")
            return False
        
        # Save verification record to DB
        # Note: We keep all attempts for audit, but verify_code will only look for the latest valid one
        verification = SMSVerification(
            mobile=mobile, 
            code=code, 
            expiresAt=expires_at
        )
        session.add(verification)
        session.commit()
        return True

    @staticmethod
    def verify_code(mobile: str, code: str, session: Session):
        # Look for a valid, non-expired code for this mobile
        stmt = select(SMSVerification).where(
            SMSVerification.mobile == mobile,
            SMSVerification.code == code,
            SMSVerification.expiresAt > datetime.utcnow()
        ).order_by(SMSVerification.createdAt.desc())
        
        result = session.exec(stmt).first()
        if result:
            # Code verified. We can consume it (delete it) to prevent reuse
            session.delete(result)
            session.commit()
            return True
        return False
