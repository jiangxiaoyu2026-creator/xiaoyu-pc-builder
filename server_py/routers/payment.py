from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from typing import List, Optional
from ..db import get_session
from ..models import Order, User
from .auth import get_current_user
import uuid
import time
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/wechat/create")
async def create_wechat_order(
    order_data: dict, 
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    # Mocking order creation
    order_id = f"WX{int(time.time())}{str(uuid.uuid4())[:6].upper()}"
    new_order = Order(
        id=order_id,
        userId=user.id,
        planId=order_data.get("planId"),
        amount=int(order_data.get("amount", 0) * 100), # to cents
        status="pending",
        payMethod="wechat"
    )
    session.add(new_order)
    session.commit()
    
    # In a real scenario, we would call Wechat-Pay SDK here to get codeUrl or payParams
    return {
        "success": True, 
        "orderId": order_id, 
        "codeUrl": "weixin://wxpay/bizpayurl?pr=mocked_url"  # Mocked
    }

@router.post("/alipay/create")
async def create_alipay_order(
    order_data: dict, 
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    order_id = f"ALI{int(time.time())}{str(uuid.uuid4())[:6].upper()}"
    new_order = Order(
        id=order_id,
        userId=user.id,
        planId=order_data.get("planId"),
        amount=int(order_data.get("amount", 0) * 100),
        status="pending",
        payMethod="alipay"
    )
    session.add(new_order)
    session.commit()
    
    # Mocked Alipay URL
    pay_url = f"https://openapi.alipay.com/gateway.do?order_id={order_id}&mock=true"
    return {"success": True, "orderId": order_id, "payUrl": pay_url}

@router.post("/wechat/notify")
async def wechat_notify(request: Request, session: Session = Depends(get_session)):
    # Verify signature and parse XML here
    # Mocking success
    body = await request.body()
    # In real world: params = parse_wechat_xml(body)
    # if verify_sign(params):
    #    order_id = params['out_trade_no']
    #    process_payment(order_id, session)
    return "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>"

@router.post("/alipay/notify")
async def alipay_notify(request: Request, session: Session = Depends(get_session)):
    # Verify signature and process
    # return "success"
    return "success"

@router.get("/order/{order_id}")
async def get_order_status(order_id: str, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "success": True,
        "order": {
            "orderId": order.id,
            "status": order.status,
            "amount": order.amount / 100,
            "payMethod": order.payMethod,
            "createdAt": order.createdAt,
            "paidAt": order.paidAt
        }
    }

def process_payment(order_id: str, session: Session):
    order = session.get(Order, order_id)
    if order and order.status == "pending":
        order.status = "paid"
        order.paidAt = datetime.utcnow().isoformat()
        
        # Update user VIP status
        user = session.get(User, order.userId)
        if user:
            # Simple logic: add 30 days if plan is 'monthly', etc.
            days_to_add = 0
            if order.planId == 'monthly': days_to_add = 31
            elif order.planId == 'yearly': days_to_add = 366
            
            current_expire = user.vipExpireAt if user.vipExpireAt and user.vipExpireAt > int(time.time()) else int(time.time())
            user.vipExpireAt = current_expire + (days_to_add * 24 * 3600)
            session.add(user)
        
        session.add(order)
        session.commit()
