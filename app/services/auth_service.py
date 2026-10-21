from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


class DuplicateUserError(Exception):
    pass


def register_user(db: Session, data: UserCreate) -> User:
    existing = db.scalar(
        select(User.id).where(or_(User.username == data.username, User.email == data.email))
    )
    if existing is not None:
        raise DuplicateUserError

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateUserError from exc
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user
