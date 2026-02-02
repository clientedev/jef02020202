from sqlalchemy.orm import Session
from backend.models import Usuario, TipoUsuario, Stage, Prospeccao
from backend.models.empresas import Empresa
from backend.models.pipeline import CompanyPipeline, CompanyStageHistory, Note
from backend.auth.security import obter_hash_senha
from datetime import datetime, timedelta, date, time
import os

def criar_usuario_admin_padrao(db: Session):
    admin_email = os.getenv("ADMIN_EMAIL", "admin@admin.com")
    admin_senha = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_nome = os.getenv("ADMIN_NAME", "Administrador")
    
    usuario_existente = db.query(Usuario).filter(Usuario.email == admin_email).first()
    
    if not usuario_existente:
        admin_usuario = Usuario(
            nome=admin_nome,
            email=admin_email,
            senha_hash=obter_hash_senha(admin_senha),
            tipo=TipoUsuario.admin
        )
        db.add(admin_usuario)
        db.commit()
        db.refresh(admin_usuario)
        print(f"✓ Usuário admin criado: {admin_email}")
        return admin_usuario
    else:
        print(f"✓ Usuário admin já existe: {admin_email}")
        return usuario_existente

def criar_consultores_padrao(db: Session):
    """Cria consultores Gabriel e Lucas para teste"""
    consultores = [
        {
            "nome": "Gabriel Silva",
            "email": "gabriel@nucleo.com",
            "senha": "gabriel123",
            "tipo": TipoUsuario.consultor
        },
        {
            "nome": "Lucas Oliveira",
            "email": "lucas@nucleo.com",
            "senha": "lucas123",
            "tipo": TipoUsuario.consultor
        }
    ]
    
    consultores_criados = 0
    for cons_data in consultores:
        consultor_existente = db.query(Usuario).filter(Usuario.email == cons_data["email"]).first()
        
        if not consultor_existente:
            novo_consultor = Usuario(
                nome=cons_data["nome"],
                email=cons_data["email"],
                senha_hash=obter_hash_senha(cons_data["senha"]),
                tipo=cons_data["tipo"]
            )
            db.add(novo_consultor)
            consultores_criados += 1
    
    if consultores_criados > 0:
        db.commit()
        print(f"✓ {consultores_criados} consultores criados")
    else:
        print(f"✓ Consultores já existem no banco")

def criar_empresas_padrao(db: Session):
    """Cria empresas padrão que permanecerão fixas no banco"""
    empresas_padrao = [
        {
            "empresa": "Petrobras S.A.",
            "cnpj": "33000167000101",
            "sigla": "PETRO",
            "porte": "Grande",
            "municipio": "Rio de Janeiro",
            "estado": "RJ",
            "pais": "Brasil",
            "area": "Petróleo e Gás",
            "tipo_empresa": "S.A.",
            "numero_funcionarios": 45000
        },
        {
            "empresa": "Vale S.A.",
            "cnpj": "33592510000154",
            "sigla": "VALE",
            "porte": "Grande",
            "municipio": "Rio de Janeiro",
            "estado": "RJ",
            "pais": "Brasil",
            "area": "Mineração",
            "tipo_empresa": "S.A.",
            "numero_funcionarios": 70000
        },
        {
            "empresa": "Banco do Brasil S.A.",
            "cnpj": "00000000000191",
            "sigla": "BB",
            "porte": "Grande",
            "municipio": "Brasília",
            "estado": "DF",
            "pais": "Brasil",
            "area": "Financeiro",
            "tipo_empresa": "S.A.",
            "numero_funcionarios": 90000
        },
        {
            "empresa": "Bradesco S.A.",
            "cnpj": "60746948000112",
            "sigla": "BRADESCO",
            "porte": "Grande",
            "municipio": "Osasco",
            "estado": "SP",
            "pais": "Brasil",
            "area": "Financeiro",
            "tipo_empresa": "S.A.",
            "numero_funcionarios": 85000
        },
        {
            "empresa": "Ambev S.A.",
            "cnpj": "07526557000100",
            "sigla": "AMBEV",
            "porte": "Grande",
            "municipio": "São Paulo",
            "estado": "SP",
            "pais": "Brasil",
            "area": "Bebidas",
            "tipo_empresa": "S.A.",
            "numero_funcionarios": 32000
        }
    ]
    
    empresas_criadas = 0
    for empresa_data in empresas_padrao:
        empresa_existente = db.query(Empresa).filter(Empresa.cnpj == empresa_data["cnpj"]).first()
        
        if not empresa_existente:
            nova_empresa = Empresa(**empresa_data)
            db.add(nova_empresa)
            empresas_criadas += 1
    
    if empresas_criadas > 0:
        db.commit()
        print(f"✓ {empresas_criadas} empresas padrão criadas")
    else:
        print(f"✓ Empresas padrão já existem no banco")

def criar_stages_padrao(db: Session):
    """Cria os estágios padrão do pipeline Kanban"""
    stages_padrao = [
        {"nome": "Prospecção", "descricao": "Empresa em prospecção inicial", "cor": "#6b7280", "ordem": 1},
        {"nome": "Proposta Enviada", "descricao": "Proposta comercial enviada", "cor": "#3b82f6", "ordem": 2},
        {"nome": "Negociação", "descricao": "Em negociação com o cliente", "cor": "#f59e0b", "ordem": 3},
        {"nome": "Contrato Assinado", "descricao": "Contrato assinado, aguardando início", "cor": "#10b981", "ordem": 4},
        {"nome": "Em Execução", "descricao": "Projeto em execução", "cor": "#8b5cf6", "ordem": 5},
        {"nome": "Concluído", "descricao": "Projeto concluído com sucesso", "cor": "#059669", "ordem": 6},
        {"nome": "Perdido", "descricao": "Oportunidade perdida", "cor": "#ef4444", "ordem": 7}
    ]
    
    stages_criados = 0
    for stage_data in stages_padrao:
        stage_existente = db.query(Stage).filter(Stage.nome == stage_data["nome"]).first()
        
        if not stage_existente:
            novo_stage = Stage(**stage_data)
            db.add(novo_stage)
            stages_criados += 1
    
    if stages_criados > 0:
        db.commit()
        print(f"✓ {stages_criados} estágios do pipeline criados")
    else:
        print(f"✓ Estágios do pipeline já existem no banco")

def popular_pipeline(db: Session):
    """Popula o pipeline com as empresas existentes"""
    pipeline_existente = db.query(CompanyPipeline).first()
    
    if pipeline_existente:
        print(f"✓ Pipeline já possui dados")
        return
    
    petrobras = db.query(Empresa).filter(Empresa.cnpj == "33000167000101").first()
    vale = db.query(Empresa).filter(Empresa.cnpj == "33592510000154").first()
    bb = db.query(Empresa).filter(Empresa.cnpj == "00000000000191").first()
    bradesco = db.query(Empresa).filter(Empresa.cnpj == "60746948000112").first()
    ambev = db.query(Empresa).filter(Empresa.cnpj == "07526557000100").first()
    
    stage_prospeccao = db.query(Stage).filter(Stage.nome == "Prospecção").first()
    stage_proposta = db.query(Stage).filter(Stage.nome == "Proposta Enviada").first()
    stage_negociacao = db.query(Stage).filter(Stage.nome == "Negociação").first()
    stage_contrato = db.query(Stage).filter(Stage.nome == "Contrato Assinado").first()
    stage_execucao = db.query(Stage).filter(Stage.nome == "Em Execução").first()
    
    gabriel = db.query(Usuario).filter(Usuario.email == "gabriel@nucleo.com").first()
    lucas = db.query(Usuario).filter(Usuario.email == "lucas@nucleo.com").first()
    
    if not all([petrobras, vale, bb, bradesco, ambev, stage_prospeccao, stage_proposta, stage_negociacao, stage_contrato, stage_execucao]):
        print("⚠ Dados necessários não encontrados para popular pipeline")
        return
    
    now = datetime.utcnow()
    
    pipeline_entries = [
        CompanyPipeline(
            empresa_id=petrobras.id,
            stage_id=stage_negociacao.id,
            consultor_id=gabriel.id if gabriel else None,
            linha="Tecnologia",
            valor_estimado=850000.00,
            probabilidade=70,
            data_entrada_stage=now - timedelta(days=5),
            nome_contato="Carlos Mendes",
            email_contato="carlos.mendes@petrobras.com.br",
            telefone_contato="(21) 99999-1234",
            cargo_contato="Gerente de TI"
        ),
        CompanyPipeline(
            empresa_id=vale.id,
            stage_id=stage_proposta.id,
            consultor_id=lucas.id if lucas else None,
            linha="Educacional",
            valor_estimado=450000.00,
            probabilidade=50,
            data_entrada_stage=now - timedelta(days=3),
            nome_contato="Maria Santos",
            email_contato="maria.santos@vale.com",
            telefone_contato="(21) 98888-5678",
            cargo_contato="Diretora de RH"
        ),
        CompanyPipeline(
            empresa_id=bb.id,
            stage_id=stage_contrato.id,
            consultor_id=gabriel.id if gabriel else None,
            linha="Tecnologia",
            valor_estimado=1200000.00,
            probabilidade=90,
            data_entrada_stage=now - timedelta(days=10),
            nome_contato="João Silva",
            email_contato="joao.silva@bb.com.br",
            telefone_contato="(61) 97777-9012",
            cargo_contato="Superintendente"
        ),
        CompanyPipeline(
            empresa_id=bradesco.id,
            stage_id=stage_prospeccao.id,
            consultor_id=lucas.id if lucas else None,
            linha="Educacional",
            valor_estimado=320000.00,
            probabilidade=30,
            data_entrada_stage=now - timedelta(days=2),
            nome_contato="Ana Ferreira",
            email_contato="ana.ferreira@bradesco.com.br",
            telefone_contato="(11) 96666-3456",
            cargo_contato="Coordenadora"
        ),
        CompanyPipeline(
            empresa_id=ambev.id,
            stage_id=stage_execucao.id,
            consultor_id=gabriel.id if gabriel else None,
            linha="Tecnologia",
            valor_estimado=780000.00,
            probabilidade=85,
            data_entrada_stage=now - timedelta(days=15),
            nome_contato="Pedro Almeida",
            email_contato="pedro.almeida@ambev.com.br",
            telefone_contato="(11) 95555-7890",
            cargo_contato="Diretor de Operações"
        )
    ]
    
    for entry in pipeline_entries:
        db.add(entry)
    
    db.commit()
    
    for entry in pipeline_entries:
        db.refresh(entry)
    
    petrobras_pipeline = pipeline_entries[0]
    vale_pipeline = pipeline_entries[1]
    bb_pipeline = pipeline_entries[2]
    bradesco_pipeline = pipeline_entries[3]
    ambev_pipeline = pipeline_entries[4]
    
    historico_entries = [
        CompanyStageHistory(company_pipeline_id=petrobras_pipeline.id, stage_anterior_id=None, stage_novo_id=stage_prospeccao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Empresa adicionada ao pipeline", data_movimentacao=now - timedelta(days=20)),
        CompanyStageHistory(company_pipeline_id=petrobras_pipeline.id, stage_anterior_id=stage_prospeccao.id, stage_novo_id=stage_proposta.id, usuario_id=gabriel.id if gabriel else None, observacoes="Proposta enviada para análise", data_movimentacao=now - timedelta(days=15)),
        CompanyStageHistory(company_pipeline_id=petrobras_pipeline.id, stage_anterior_id=stage_proposta.id, stage_novo_id=stage_negociacao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Cliente interessado, iniciando negociação", data_movimentacao=now - timedelta(days=5)),
        CompanyStageHistory(company_pipeline_id=vale_pipeline.id, stage_anterior_id=None, stage_novo_id=stage_prospeccao.id, usuario_id=lucas.id if lucas else None, observacoes="Novo cliente identificado", data_movimentacao=now - timedelta(days=10)),
        CompanyStageHistory(company_pipeline_id=vale_pipeline.id, stage_anterior_id=stage_prospeccao.id, stage_novo_id=stage_proposta.id, usuario_id=lucas.id if lucas else None, observacoes="Proposta de treinamento enviada", data_movimentacao=now - timedelta(days=3)),
        CompanyStageHistory(company_pipeline_id=bb_pipeline.id, stage_anterior_id=None, stage_novo_id=stage_prospeccao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Contato inicial realizado", data_movimentacao=now - timedelta(days=30)),
        CompanyStageHistory(company_pipeline_id=bb_pipeline.id, stage_anterior_id=stage_prospeccao.id, stage_novo_id=stage_proposta.id, usuario_id=gabriel.id if gabriel else None, observacoes="Proposta aprovada internamente", data_movimentacao=now - timedelta(days=25)),
        CompanyStageHistory(company_pipeline_id=bb_pipeline.id, stage_anterior_id=stage_proposta.id, stage_novo_id=stage_negociacao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Negociação de valores", data_movimentacao=now - timedelta(days=18)),
        CompanyStageHistory(company_pipeline_id=bb_pipeline.id, stage_anterior_id=stage_negociacao.id, stage_novo_id=stage_contrato.id, usuario_id=gabriel.id if gabriel else None, observacoes="Contrato assinado com sucesso!", data_movimentacao=now - timedelta(days=10)),
        CompanyStageHistory(company_pipeline_id=bradesco_pipeline.id, stage_anterior_id=None, stage_novo_id=stage_prospeccao.id, usuario_id=lucas.id if lucas else None, observacoes="Lead qualificado", data_movimentacao=now - timedelta(days=2)),
        CompanyStageHistory(company_pipeline_id=ambev_pipeline.id, stage_anterior_id=None, stage_novo_id=stage_prospeccao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Primeiro contato", data_movimentacao=now - timedelta(days=45)),
        CompanyStageHistory(company_pipeline_id=ambev_pipeline.id, stage_anterior_id=stage_prospeccao.id, stage_novo_id=stage_proposta.id, usuario_id=gabriel.id if gabriel else None, observacoes="Proposta enviada", data_movimentacao=now - timedelta(days=35)),
        CompanyStageHistory(company_pipeline_id=ambev_pipeline.id, stage_anterior_id=stage_proposta.id, stage_novo_id=stage_negociacao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Fase de negociação", data_movimentacao=now - timedelta(days=25)),
        CompanyStageHistory(company_pipeline_id=ambev_pipeline.id, stage_anterior_id=stage_negociacao.id, stage_novo_id=stage_contrato.id, usuario_id=gabriel.id if gabriel else None, observacoes="Contrato fechado", data_movimentacao=now - timedelta(days=20)),
        CompanyStageHistory(company_pipeline_id=ambev_pipeline.id, stage_anterior_id=stage_contrato.id, stage_novo_id=stage_execucao.id, usuario_id=gabriel.id if gabriel else None, observacoes="Projeto iniciado", data_movimentacao=now - timedelta(days=15))
    ]
    
    for hist in historico_entries:
        db.add(hist)
    
    notes_entries = [
        Note(company_pipeline_id=petrobras_pipeline.id, usuario_id=gabriel.id if gabriel else None, titulo="Reunião inicial", conteudo="Cliente muito interessado em soluções de automação. Próximo passo: agendar demo técnica.", tipo="reuniao", importante=True, criado_em=now - timedelta(days=5)),
        Note(company_pipeline_id=petrobras_pipeline.id, usuario_id=gabriel.id if gabriel else None, titulo="Follow-up", conteudo="Ligação de acompanhamento realizada. Cliente aguardando aprovação do orçamento.", tipo="ligacao", importante=False, criado_em=now - timedelta(days=2)),
        Note(company_pipeline_id=vale_pipeline.id, usuario_id=lucas.id if lucas else None, titulo="Proposta enviada", conteudo="Enviada proposta de capacitação para 200 colaboradores. Aguardando retorno.", tipo="email", importante=False, criado_em=now - timedelta(days=3)),
        Note(company_pipeline_id=bb_pipeline.id, usuario_id=gabriel.id if gabriel else None, titulo="Contrato fechado!", conteudo="Grande vitória! Contrato assinado para implementação completa do sistema.", tipo="nota", importante=True, criado_em=now - timedelta(days=10)),
        Note(company_pipeline_id=ambev_pipeline.id, usuario_id=gabriel.id if gabriel else None, titulo="Kickoff realizado", conteudo="Reunião de início do projeto realizada com sucesso. Time alocado e cronograma definido.", tipo="reuniao", importante=True, criado_em=now - timedelta(days=15))
    ]
    
    for note in notes_entries:
        db.add(note)
    
    db.commit()
    print(f"✓ Pipeline populado com 5 empresas, histórico e notas")

def criar_prospeccoes_padrao(db: Session):
    """Cria prospecções de teste para as empresas existentes"""
    prospeccao_existente = db.query(Prospeccao).first()
    
    if prospeccao_existente:
        print(f"✓ Prospecções já existem no banco")
        return
    
    petrobras = db.query(Empresa).filter(Empresa.cnpj == "33000167000101").first()
    vale = db.query(Empresa).filter(Empresa.cnpj == "33592510000154").first()
    bb = db.query(Empresa).filter(Empresa.cnpj == "00000000000191").first()
    bradesco = db.query(Empresa).filter(Empresa.cnpj == "60746948000112").first()
    ambev = db.query(Empresa).filter(Empresa.cnpj == "07526557000100").first()
    
    gabriel = db.query(Usuario).filter(Usuario.email == "gabriel@nucleo.com").first()
    lucas = db.query(Usuario).filter(Usuario.email == "lucas@nucleo.com").first()
    admin = db.query(Usuario).filter(Usuario.email == "admin@admin.com").first()
    
    if not all([petrobras, vale, bb, bradesco, ambev]):
        print("⚠ Empresas não encontradas para criar prospecções")
        return
    
    consultor_id = gabriel.id if gabriel else (lucas.id if lucas else (admin.id if admin else 1))
    consultor2_id = lucas.id if lucas else consultor_id
    
    hoje = date.today()
    
    prospeccoes = [
        Prospeccao(
            empresa_id=petrobras.id,
            consultor_id=consultor_id,
            data_ligacao=hoje - timedelta(days=5),
            hora_ligacao=time(10, 30),
            resultado="Interessado em proposta",
            observacoes="Cliente demonstrou interesse em soluções de TI. Agendar reunião presencial.",
            nome_contato="Carlos Mendes",
            cargo_contato="Gerente de TI",
            telefone_contato="(21) 99999-1234",
            email_contato="carlos.mendes@petrobras.com.br",
            interesse_treinamento=True,
            interesse_consultoria=True,
            potencial_negocio="Alto",
            status_prospeccao="Em andamento"
        ),
        Prospeccao(
            empresa_id=vale.id,
            consultor_id=consultor2_id,
            data_ligacao=hoje - timedelta(days=3),
            hora_ligacao=time(14, 0),
            resultado="Agendar retorno",
            observacoes="Responsável em reunião. Ligar novamente amanhã às 15h.",
            nome_contato="Maria Santos",
            cargo_contato="Diretora de RH",
            telefone_contato="(21) 98888-5678",
            email_contato="maria.santos@vale.com",
            interesse_treinamento=True,
            interesse_eventos=True,
            potencial_negocio="Médio",
            status_prospeccao="Aguardando retorno"
        ),
        Prospeccao(
            empresa_id=bb.id,
            consultor_id=consultor_id,
            data_ligacao=hoje - timedelta(days=10),
            hora_ligacao=time(9, 0),
            resultado="Proposta enviada",
            observacoes="Proposta comercial enviada por email. Aguardando aprovação interna.",
            nome_contato="João Silva",
            cargo_contato="Superintendente",
            telefone_contato="(61) 97777-9012",
            email_contato="joao.silva@bb.com.br",
            interesse_consultoria=True,
            interesse_certificacao=True,
            potencial_negocio="Alto",
            status_prospeccao="Proposta enviada"
        ),
        Prospeccao(
            empresa_id=bradesco.id,
            consultor_id=consultor2_id,
            data_ligacao=hoje - timedelta(days=2),
            hora_ligacao=time(11, 30),
            resultado="Primeiro contato",
            observacoes="Primeiro contato realizado. Cliente solicitou mais informações por email.",
            nome_contato="Ana Ferreira",
            cargo_contato="Coordenadora",
            telefone_contato="(11) 96666-3456",
            email_contato="ana.ferreira@bradesco.com.br",
            interesse_treinamento=True,
            potencial_negocio="Médio",
            status_prospeccao="Em prospecção"
        ),
        Prospeccao(
            empresa_id=ambev.id,
            consultor_id=consultor_id,
            data_ligacao=hoje - timedelta(days=7),
            hora_ligacao=time(16, 0),
            resultado="Reunião agendada",
            observacoes="Cliente interessado em consultoria. Reunião agendada para próxima semana.",
            nome_contato="Pedro Almeida",
            cargo_contato="Diretor de Operações",
            telefone_contato="(11) 95555-7890",
            email_contato="pedro.almeida@ambev.com.br",
            interesse_consultoria=True,
            interesse_seguranca=True,
            interesse_meio_ambiente=True,
            potencial_negocio="Alto",
            status_prospeccao="Reunião agendada"
        )
    ]
    
    for prosp in prospeccoes:
        db.add(prosp)
    
    db.commit()
    print(f"✓ {len(prospeccoes)} prospecções criadas")
