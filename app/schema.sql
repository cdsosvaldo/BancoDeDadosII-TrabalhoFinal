CREATE TABLE IF NOT EXISTS especialidade (
    codigo SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mae (
    cpf TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    data_nascimento DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS medico (
    crm TEXT PRIMARY KEY,
    cpf TEXT NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    especialidade_codigo INTEGER NOT NULL REFERENCES especialidade(codigo)
);

CREATE TABLE IF NOT EXISTS bebe (
    registro SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    data_nascimento DATE NOT NULL,
    peso NUMERIC(5, 3) NOT NULL,
    altura NUMERIC(5, 2) NOT NULL,
    mae_cpf TEXT NOT NULL REFERENCES mae(cpf),
    medico_crm TEXT NOT NULL REFERENCES medico(crm)
);

CREATE OR REPLACE FUNCTION bebe_valida() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.peso <= 0 THEN
        RAISE EXCEPTION 'Peso deve ser maior que zero';
    END IF;
    IF NEW.altura <= 0 THEN
        RAISE EXCEPTION 'Altura deve ser maior que zero';
    END IF;
    IF NEW.data_nascimento > CURRENT_DATE THEN
        RAISE EXCEPTION 'Data de nascimento nao pode ser futura';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bebe_valida_trigger ON bebe;
CREATE TRIGGER bebe_valida_trigger
BEFORE INSERT OR UPDATE ON bebe
FOR EACH ROW EXECUTE FUNCTION bebe_valida();

CREATE OR REPLACE FUNCTION mae_protege_delete() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM bebe WHERE mae_cpf = OLD.cpf) THEN
        RAISE EXCEPTION 'Mae possui bebes cadastrados';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mae_protege_delete_trigger ON mae;
CREATE TRIGGER mae_protege_delete_trigger
BEFORE DELETE ON mae
FOR EACH ROW EXECUTE FUNCTION mae_protege_delete();

CREATE OR REPLACE FUNCTION medico_protege_delete() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM bebe WHERE medico_crm = OLD.crm) THEN
        RAISE EXCEPTION 'Medico possui partos registrados';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medico_protege_delete_trigger ON medico;
CREATE TRIGGER medico_protege_delete_trigger
BEFORE DELETE ON medico
FOR EACH ROW EXECUTE FUNCTION medico_protege_delete();

CREATE OR REPLACE FUNCTION especialidade_protege_delete() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM medico WHERE especialidade_codigo = OLD.codigo) THEN
        RAISE EXCEPTION 'Especialidade possui medicos vinculados';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS especialidade_protege_delete_trigger ON especialidade;
CREATE TRIGGER especialidade_protege_delete_trigger
BEFORE DELETE ON especialidade
FOR EACH ROW EXECUTE FUNCTION especialidade_protege_delete();

CREATE OR REPLACE FUNCTION especialidade_listar() RETURNS SETOF especialidade AS $$
    SELECT * FROM especialidade ORDER BY codigo;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION mae_listar() RETURNS SETOF mae AS $$
    SELECT * FROM mae ORDER BY nome;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION medico_listar() RETURNS SETOF medico AS $$
    SELECT * FROM medico ORDER BY nome;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION bebe_listar() RETURNS SETOF bebe AS $$
    SELECT * FROM bebe ORDER BY registro;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION especialidade_inserir(p_descricao TEXT)
RETURNS INTEGER AS $$
    INSERT INTO especialidade (descricao) VALUES (p_descricao) RETURNING codigo;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION mae_inserir(
    p_cpf TEXT, p_nome TEXT, p_endereco TEXT, p_telefone TEXT, p_data_nascimento DATE
) RETURNS TEXT AS $$
    INSERT INTO mae (cpf, nome, endereco, telefone, data_nascimento)
    VALUES (p_cpf, p_nome, p_endereco, p_telefone, p_data_nascimento)
    RETURNING cpf;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION medico_inserir(
    p_crm TEXT, p_cpf TEXT, p_nome TEXT, p_telefone TEXT, p_especialidade_codigo INTEGER
) RETURNS TEXT AS $$
    INSERT INTO medico (crm, cpf, nome, telefone, especialidade_codigo)
    VALUES (p_crm, p_cpf, p_nome, p_telefone, p_especialidade_codigo)
    RETURNING crm;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION bebe_inserir(
    p_nome TEXT, p_data_nascimento DATE, p_peso NUMERIC, p_altura NUMERIC,
    p_mae_cpf TEXT, p_medico_crm TEXT
) RETURNS INTEGER AS $$
    INSERT INTO bebe (nome, data_nascimento, peso, altura, mae_cpf, medico_crm)
    VALUES (p_nome, p_data_nascimento, p_peso, p_altura, p_mae_cpf, p_medico_crm)
    RETURNING registro;
$$ LANGUAGE sql;

CREATE OR REPLACE PROCEDURE especialidade_atualizar(p_codigo INTEGER, p_descricao TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE especialidade SET descricao = p_descricao WHERE codigo = p_codigo;
END;
$$;

CREATE OR REPLACE PROCEDURE mae_atualizar(
    p_cpf TEXT, p_nome TEXT, p_endereco TEXT, p_telefone TEXT, p_data_nascimento DATE
) LANGUAGE plpgsql AS $$
BEGIN
    UPDATE mae SET nome = p_nome, endereco = p_endereco, telefone = p_telefone,
                   data_nascimento = p_data_nascimento
    WHERE cpf = p_cpf;
END;
$$;

CREATE OR REPLACE PROCEDURE medico_atualizar(
    p_crm TEXT, p_cpf TEXT, p_nome TEXT, p_telefone TEXT, p_especialidade_codigo INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
    UPDATE medico SET cpf = p_cpf, nome = p_nome, telefone = p_telefone,
                      especialidade_codigo = p_especialidade_codigo
    WHERE crm = p_crm;
END;
$$;

CREATE OR REPLACE PROCEDURE bebe_atualizar(
    p_registro INTEGER, p_nome TEXT, p_data_nascimento DATE, p_peso NUMERIC,
    p_altura NUMERIC, p_mae_cpf TEXT, p_medico_crm TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    UPDATE bebe SET nome = p_nome, data_nascimento = p_data_nascimento, peso = p_peso,
                    altura = p_altura, mae_cpf = p_mae_cpf, medico_crm = p_medico_crm
    WHERE registro = p_registro;
END;
$$;

CREATE OR REPLACE PROCEDURE especialidade_excluir(p_codigo INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM especialidade WHERE codigo = p_codigo;
END;
$$;

CREATE OR REPLACE PROCEDURE mae_excluir(p_cpf TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM mae WHERE cpf = p_cpf;
END;
$$;

CREATE OR REPLACE PROCEDURE medico_excluir(p_crm TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM medico WHERE crm = p_crm;
END;
$$;

CREATE OR REPLACE PROCEDURE bebe_excluir(p_registro INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM bebe WHERE registro = p_registro;
END;
$$;
