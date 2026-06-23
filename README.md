## Sistema de Gestão de Berçário

Uma aplicação web completa projetada para informatizar e gerenciar as operações diárias de um berçário. O grande diferencial técnico deste projeto é a centralização total das regras de negócio e operações de persistência diretamente na camada de dados através do PostgreSQL.

--
## 1. Arquitetura e Cumprimento dos Requisitos
Para atender às exigências do enunciado, o acoplamento entre a aplicação e o banco foi estruturado da seguinte forma:

• Lógica de Negócio Centralizada (Banco de Dados): Nenhuma validação complexa roda no backend. O PostgreSQL gerencia as regras via TRIGGERS (restrições e consistência) e expõe operações de manipulação por STORED FUNCTIONS e STORED PROCEDURES.
• Abstração Sem ORM: O backend abdica de frameworks de mapeamento objeto-relacional (como SQLAlchemy). Toda a comunicação é feita via instruções SQL puras (SELECT e CALL) utilizando o driver nativo psycopg2.
• Interface e API Web: Uma API construída em FastAPI expõe os endpoints de forma dinâmica, consumidos por uma interface SPA (Single Page Application) responsiva em vanilla HTML/CSS/JS.

--
## 2. Organização do Repositório
.
├── app/                  
│   ├── schema.sql        
│   ├── database.py       
│   └── main.py           
├── web/                  
│   ├── index.html        
│   ├── css/style.css    
│   └── js/app.js         
├── Dockerfile            
├── docker-compose.yml    
├── run.py                
├── requirements.txt      
└── README.md             

## 3. Modelagem do Banco de Dados

• Entidade (especialidade)
codigo (SERIAL, PK): Identificador único da especialidade médica.
descricao (TEXT, NOT NULL): Nome da especialização.

• Entidade (mae)
cpf (TEXT, PK): Registro de Pessoa Física da mãe.
nome (TEXT, NOT NULL): Nome completo.
endereco (TEXT): Endereço residencial.
telefone (TEXT): Número de contato.
data_nascimento (DATE, NOT NULL): Data de nascimento.

• Entidade (medico)
crm (TEXT, PK): Registro do Conselho Regional de Medicina.
cpf (TEXT, NOT NULL): CPF do médico.
nome (TEXT, NOT NULL): Nome completo.
telefone (TEXT): Telefone de contato.
especialidade_codigo (INTEGER, FK → especialidade): Vínculo com a área médica.

• Entidade (bebe)
registro (SERIAL, PK): Matrícula única do recém-nascido.
nome (TEXT, NOT NULL): Nome do bebê.
data_nascimento (DATE, NOT NULL): Data do parto.
peso (NUMERIC(5,3), NOT NULL): Peso em kg no momento do nascimento.
altura (NUMERIC(5,2), NOT NULL): Altura em centímetros.
mae_cpf (TEXT, FK → mae): Associação à mãe biológica.
medico_crm (TEXT, FK → medico): Obstetra responsável pelo parto.

## 4. Rotinas e Segurança

• Rotinas do CRUD (Functions & Procedures)
SELECT * FROM <tabela>_listar(): Retorna o conjunto de dados (SETOF) da entidade.
SELECT <tabela>_inserir(...): Executa a inserção e retorna o ID/Chave Primária gerada.
CALL <tabela>_atualizar(id, ...): Procedure para modificação de registros existentes.
CALL <tabela>_excluir(id): Procedure para remoção física de dados.

• Regras de Integridade Comercial (Triggers)
O banco autogere sua segurança através de gatilhos acionados em eventos específicos:
bebe_valida_trigger (Antes de Inserir/Atualizar): Bloqueia registros com pesos ou alturas negativas/nulas, bem como datas de nascimento futuras.
mae_protege_delete_trigger (Antes de Deletar): Impede a exclusão de uma mãe caso ela possua bebês vinculados no sistema.
medico_protege_delete_trigger (Antes de Deletar): Impede o desligamento de médicos com históricos de partos realizados.
especialidade_protege_delete_trigger (Antes de Deletar): Restringe a remoção de especialidades que possuam médicos associados.

Nota: Toda falha nas restrições dispara um RAISE EXCEPTION. O backend captura esse erro e o repassa integralmente ao usuário.

## 5. Endpoints da API (REST)

GET /api/{entidade} | Executa SELECT * FROM <tabela>_listar()
POST /api/{entidade} | Executa SELECT <tabela>_inserir(...)
PUT /api/{entidade}/{id} | Executa CALL <tabela>_atualizar(...)
DELETE /api/{entidade}/{id} | Executa CALL <tabela>_excluir(...)

Tratamento de Erros: Exceções do PostgreSQL resultam em HTTP 400 Bad Request com o detalhamento do erro enviado no corpo da resposta (detail).
Documentação: A especificação OpenAPI/Swagger completa fica disponível em /docs.

Nota: O backend utiliza reflexão para ler a configuração ENTITIES em app/main.py e expor os endpoints de forma automática. Substitua {entidade} por especialidades, maes, medicos ou bebes.

## 6. Como Rodar o Projeto

Método Padrão: Via Docker Compose
Certifique-se de possuir o Docker instalado em sua máquina e execute no terminal:

```Bash
docker compose up --build
``` 

Este comando provisionará o banco de dados (porta 5432) e esperará que ele esteja pronto para aceitar conexões. Em seguida, a aplicação FastAPI iniciará na porta 8000, executando automaticamente o script schema.sql para preparar o banco.

Acesse o sistema em: http://127.0.0.1:8000

### Comandos de Encerramento

``` Bash
# Para parar os contêineres:
docker compose down

# Para parar apagando permanentemente os dados salvos no banco:
docker compose down -v
```

### Método de Desenvolvimento: Banco no Docker + App Local
Para debugar o código Python localmente:

• 1. inicie apenas o banco de dados:
``` Bash
docker compose up db
```

• 2. instale as dependências locais e inicie o servidor:
```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

• A aplicação buscará a variável de ambiente DATABASE_URL. Caso esteja vazia, usará o valor padrão de desenvolvimento:

``` Snippet de código
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bercario
```


