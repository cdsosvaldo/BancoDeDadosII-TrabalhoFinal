from pathlib import Path

import psycopg2
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import database as db

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

ENTITIES = {
    "especialidades": {
        "table": "especialidade",
        "insert_params": ["descricao"],
        "update_params": ["descricao"],
    },
    "maes": {
        "table": "mae",
        "insert_params": ["cpf", "nome", "endereco", "telefone", "data_nascimento"],
        "update_params": ["nome", "endereco", "telefone", "data_nascimento"],
    },
    "medicos": {
        "table": "medico",
        "insert_params": ["crm", "cpf", "nome", "telefone", "especialidade_codigo"],
        "update_params": ["cpf", "nome", "telefone", "especialidade_codigo"],
    },
    "bebes": {
        "table": "bebe",
        "insert_params": ["nome", "data_nascimento", "peso", "altura", "mae_cpf", "medico_crm"],
        "update_params": ["nome", "data_nascimento", "peso", "altura", "mae_cpf", "medico_crm"],
    },
}

db.init_db()
app = FastAPI(title="Sistema de Berçário")


def values_of(payload, params):
    return [None if payload.get(p) in (None, "") else payload.get(p) for p in params]


def guard(action):
    try:
        return action()
    except psycopg2.Error as error:
        detail = error.diag.message_primary if error.diag and error.diag.message_primary else str(error)
        raise HTTPException(status_code=400, detail=detail)


def make_routes(name, cfg):
    table = cfg["table"]
    insert_params = cfg["insert_params"]
    update_params = cfg["update_params"]

    def list_all():
        return db.list_rows(table)

    async def create(request: Request):
        values = values_of(await request.json(), insert_params)
        return guard(lambda: {"id": db.create_row(table, values)})

    async def update(key: str, request: Request):
        values = values_of(await request.json(), update_params)
        guard(lambda: db.update_row(table, key, values))
        return Response(status_code=204)

    def delete(key: str):
        guard(lambda: db.delete_row(table, key))
        return Response(status_code=204)

    for handler, suffix in ((list_all, "list"), (create, "create"), (update, "update"), (delete, "delete")):
        handler.__name__ = f"{suffix}_{name}"

    app.add_api_route(f"/api/{name}", list_all, methods=["GET"])
    app.add_api_route(f"/api/{name}", create, methods=["POST"], status_code=201)
    app.add_api_route(f"/api/{name}/{{key}}", update, methods=["PUT"])
    app.add_api_route(f"/api/{name}/{{key}}", delete, methods=["DELETE"])


for entity_name, entity_cfg in ENTITIES.items():
    make_routes(entity_name, entity_cfg)


@app.get("/")
def index():
    return FileResponse(WEB_DIR / "index.html")


app.mount("/web", StaticFiles(directory=WEB_DIR), name="web")
