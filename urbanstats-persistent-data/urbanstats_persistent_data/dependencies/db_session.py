import typing as t

from fastapi import Depends

from ..db.utils import DbSession


def db_session() -> t.Generator[DbSession, None, None]:
    session = DbSession()
    try:
        yield session
        session.conn.commit()
    except:
        session.conn.rollback()
        raise
    finally:
        session.conn.close()


GetDbSession = t.Annotated[DbSession, Depends(db_session)]
