import os
import time
from contextlib import closing
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"
DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bercario")


def connect():
    return psycopg2.connect(DSN)


def init_db(retries=10, delay=2):
    error = None
    for _ in range(retries):
        try:
            with closing(connect()) as conn, conn, conn.cursor() as cur:
                cur.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
            return
        except psycopg2.OperationalError as exc:
            error = exc
            time.sleep(delay)
    raise error


def fetch(sql, params=()):
    with closing(connect()) as conn, conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def call(sql, params=()):
    with closing(connect()) as conn, conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()[0] if cur.description else None


def list_rows(table):
    return fetch(f"SELECT * FROM {table}_listar()")


def create_row(table, values):
    placeholders = ", ".join(["%s"] * len(values))
    return call(f"SELECT {table}_inserir({placeholders})", values)


def update_row(table, pk_value, values):
    placeholders = ", ".join(["%s"] * (len(values) + 1))
    call(f"CALL {table}_atualizar({placeholders})", [pk_value, *values])


def delete_row(table, pk_value):
    call(f"CALL {table}_excluir(%s)", [pk_value])
