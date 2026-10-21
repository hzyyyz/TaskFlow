from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import utc_now
from app.schemas.task import TaskCreate, TaskUpdate


def create_task(db: Session, owner_id: int, data: TaskCreate) -> Task:
    task = Task(**data.model_dump(), owner_id=owner_id)
    db.add(task)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(task)
    return task


def list_tasks(
    db: Session,
    owner_id: int,
    page: int,
    page_size: int,
    status: TaskStatus | None,
    priority: TaskPriority | None,
) -> tuple[list[Task], int]:
    conditions = [Task.owner_id == owner_id]
    if status is not None:
        conditions.append(Task.status == status)
    if priority is not None:
        conditions.append(Task.priority == priority)
    total = db.scalar(select(func.count()).select_from(Task).where(*conditions)) or 0
    items = list(db.scalars(
        select(Task).where(*conditions)
        .order_by(Task.created_at.desc(), Task.id.desc())
        .offset((page - 1) * page_size).limit(page_size)
    ))
    return items, total


def get_task(db: Session, task_id: int, owner_id: int) -> Task | None:
    return db.scalar(select(Task).where(Task.id == task_id, Task.owner_id == owner_id))


def update_task(db: Session, task_id: int, owner_id: int, data: TaskUpdate) -> Task | None:
    task = get_task(db, task_id, owner_id)
    if task is None:
        return None
    for name, value in data.model_dump(exclude_unset=True).items():
        setattr(task, name, value)
    task.updated_at = utc_now()
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int, owner_id: int) -> bool:
    task = get_task(db, task_id, owner_id)
    if task is None:
        return False
    db.delete(task)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    return True
