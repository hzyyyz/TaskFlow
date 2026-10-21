from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskPage, TaskRead, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


def not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Task not found")


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    return task_service.create_task(db, current_user.id, data)


@router.get("", response_model=TaskPage)
def list_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
) -> TaskPage:
    items, total = task_service.list_tasks(
        db, current_user.id, page, page_size, status, priority,
    )
    return TaskPage(items=[TaskRead.model_validate(item) for item in items],
                    total=total, page=page, page_size=page_size)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    task = task_service.get_task(db, task_id, current_user.id)
    if task is None:
        raise not_found()
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    task = task_service.update_task(db, task_id, current_user.id, data)
    if task is None:
        raise not_found()
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    if not task_service.delete_task(db, task_id, current_user.id):
        raise not_found()
