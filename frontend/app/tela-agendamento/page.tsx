'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import './agendamento.css';

// ============================================================
// CONFIG API
// ============================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ============================================================
// TIPOS
// ============================================================

type EtapaAgendamento =
  | 'calendario'
  | 'horarios'
  | 'formulario'
  | 'confirmacao';

interface DadosCliente {
  nome: string;
  sobrenome: string;
  telefone?: string;
}

interface Agendamento {
  data: Date;
  horario: string;
  cliente: DadosCliente;
  codigoConfirmacao?: string;
}

interface StatusBarbearia {
  aberto: boolean;
  mensagem: string;
}

interface SlotHorario {
  horario: string;
  disponivel: boolean;
}

// ============================================================
// CONSTANTES
// ============================================================

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const NOMES_DIAS_SEMANA_ABREVIADOS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function formatarDataCompleta(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function toISOLocal(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dataNoPassado(data: Date): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia < hoje;
}

function diaFechado(data: Date): boolean {
  return data.getDay() === 0;
}

function gerarDiasCalendario(
  ano: number,
  mes: number
): (Date | null)[] {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const dias: (Date | null)[] = [];

  for (let i = 0; i < primeiroDia.getDay(); i++) {
    dias.push(null);
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    dias.push(new Date(ano, mes, dia));
  }

  return dias;
}

// ============================================================
// COMPONENTE STATUS
// ============================================================

function BadgeStatus() {
  const [status, setStatus] = useState<StatusBarbearia>({
    aberto: false,
    mensagem: 'Verificando...',
  });

  useEffect(() => {
    async function carregarStatus() {
      try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        setStatus(data);
      } catch {
        setStatus({ aberto: false, mensagem: 'Servidor Offline' });
      }
    }

    carregarStatus();
    const intervalo = setInterval(carregarStatus, 60000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div
      className={`badge-status ${
        status.aberto ? 'badge-status-aberto' : 'badge-status-fechado'
      }`}
    >
      <span className="badge-indicador" />
      <span>{status.mensagem}</span>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function SistemaAgendamento() {
  const router = useRouter();

  const [etapaAtual, setEtapaAtual] =
    useState<EtapaAgendamento>('calendario');
  const [mesAtual, setMesAtual] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<Agendamento | null>(null);

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');

  const [confirmando, setConfirmando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<SlotHorario[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const diasCalendario = gerarDiasCalendario(ano, mes);

  const podeMesAnterior =
    ano > new Date().getFullYear() ||
    (ano === new Date().getFullYear() && mes > new Date().getMonth());

  // ============================================================
  // VERIFICAR TOKEN AO CARREGAR — redireciona se inválido
  // ============================================================

  useEffect(() => {
    async function verificarAutenticacao() {
      const token = Cookies.get('token');

      // Sem token: limpa tudo e vai para login
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        // Faz uma requisição autenticada para validar o token no backend.
        // Se o usuário foi deletado, o backend retorna 401.
        const res = await fetch(`${API_URL}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          // Token inválido ou usuário não existe mais
          Cookies.remove('token');
          router.replace('/login');
        }
      } catch {
        // Erro de rede: deixa o usuário continuar
        // (não deslogar por instabilidade do servidor)
      }
    }

    verificarAutenticacao();
  }, [router]);

  // ============================================================
  // CARREGAR HORÁRIOS
  // ============================================================

useEffect(() => {
    async function carregarHorarios() {
      if (!dataSelecionada) return;

      try {
        setCarregandoHorarios(true);
        const dataISO = toISOLocal(dataSelecionada);
        const res = await fetch(`${API_URL}/api/disponibilidade?data=${dataISO}`);
        const data: SlotHorario[] = await res.json();

        const semIntervalo = data.filter(({ horario }) => {
          const [h, m] = horario.split(':').map(Number);
          const totalMin = h * 60 + m;
          return totalMin < 12 * 60 || totalMin >= 14 * 60;
        });

        setHorarios(semIntervalo);
      } catch (err) {
        console.error(err);
      } finally {
        setCarregandoHorarios(false);
      }
    }

    carregarHorarios();
  }, [dataSelecionada]);

  // ============================================================
  // CARREGAR / SALVAR DADOS LOCAIS
  // ============================================================

  useEffect(() => {
    const nomeSalvo = localStorage.getItem('cliente_nome');
    const sobrenomeSalvo = localStorage.getItem('cliente_sobrenome');
    const telefoneSalvo = localStorage.getItem('cliente_telefone');

    if (nomeSalvo) setNome(nomeSalvo);
    if (sobrenomeSalvo) setSobrenome(sobrenomeSalvo);
    if (telefoneSalvo) setTelefone(telefoneSalvo);
  }, []);

  useEffect(() => {
    localStorage.setItem('cliente_nome', nome);
    localStorage.setItem('cliente_sobrenome', sobrenome);
    localStorage.setItem('cliente_telefone', telefone);
  }, [nome, sobrenome, telefone]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleSelecionarData = useCallback((data: Date) => {
    setDataSelecionada(data);
    setEtapaAtual('horarios');
  }, []);

  const handleSelecionarHorario = useCallback((horario: string) => {
    setHorarioSelecionado(horario);
    setEtapaAtual('formulario');
  }, []);

  const handleConfirmar = useCallback(async () => {
    if (!dataSelecionada || !horarioSelecionado || !nome || !sobrenome) return;
    if (bloqueado) return;

    try {
      setBloqueado(true);
      setConfirmando(true);
      setErroConfirmacao(null);

      const res = await fetch(`${API_URL}/api/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: toISOLocal(dataSelecionada),
          horario: horarioSelecionado,
          cliente: { nome, sobrenome, telefone },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensagem || data.erro || 'Erro ao agendar');
      }

      setAgendamentoConfirmado({
        data: dataSelecionada,
        horario: horarioSelecionado,
        cliente: { nome, sobrenome, telefone },
        codigoConfirmacao: data.codigoConfirmacao,
      });

      setEtapaAtual('confirmacao');
    } catch (e: unknown) {
      setErroConfirmacao(
        e instanceof Error ? e.message : 'Erro ao confirmar'
      );
    } finally {
      setConfirmando(false);
      setTimeout(() => setBloqueado(false), 1000);
    }
  }, [dataSelecionada, horarioSelecionado, nome, sobrenome, telefone, bloqueado]);

  const handleNovoAgendamento = useCallback(() => {
    setEtapaAtual('calendario');
    setDataSelecionada(null);
    setHorarioSelecionado(null);
    setAgendamentoConfirmado(null);
    setErroConfirmacao(null);
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="sistema-app">
      <div className="sistema-wrapper">

        {/* HEADER */}
        <header className="sistema-header">
          <div className="sistema-header-logo">
            <span className="sistema-header-icone" aria-hidden="true">✂</span>
            <div>
              <h1 className="sistema-titulo">Alves Barbearia</h1>
              <p className="sistema-subtitulo">Sistema de Agendamento</p>
            </div>
          </div>
          <div className="sistema-badge-wrapper">
            <BadgeStatus />
          </div>
        </header>

        {/* PROGRESSO */}
        {etapaAtual !== 'confirmacao' && (
          <IndicadorProgresso etapa={etapaAtual} />
        )}

        {/* CALENDÁRIO */}
        {etapaAtual === 'calendario' && (
          <div className="sistema-card">
            <div className="calendario-header">
              <button
                className="calendario-nav-btn"
                disabled={!podeMesAnterior}
                onClick={() => setMesAtual(new Date(ano, mes - 1, 1))}
              >←</button>

              <h2 className="calendario-titulo">
                {NOMES_MESES[mes]} {ano}
              </h2>

              <button
                className="calendario-nav-btn"
                onClick={() => setMesAtual(new Date(ano, mes + 1, 1))}
              >→</button>
            </div>

            <div className="calendario-semana">
              {NOMES_DIAS_SEMANA_ABREVIADOS.map((dia) => (
                <div key={dia} className="calendario-semana-dia">{dia}</div>
              ))}
            </div>

            <div className="calendario-grid">
              {diasCalendario.map((data, index) => {
                if (!data) return <div key={`vazio-${index}`} />;

                const desabilitado = dataNoPassado(data) || diaFechado(data);
                const ehHoje = data.toDateString() === new Date().toDateString();

                return (
                  <button
                    key={data.toISOString()}
                    disabled={desabilitado}
                    onClick={() => handleSelecionarData(data)}
                    className={[
                      'calendario-dia',
                      desabilitado ? 'calendario-dia-desabilitado' : '',
                      ehHoje ? 'calendario-dia-hoje' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {data.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

{/* HORÁRIOS */}
        {etapaAtual === 'horarios' && dataSelecionada && (
          <div className="sistema-card">
            <button className="btn-voltar" onClick={() => setEtapaAtual('calendario')}>
              ← Voltar
            </button>

            <h2 className="sistema-section-title">Horários Disponíveis</h2>
            <p className="sistema-text-muted">{formatarDataCompleta(dataSelecionada)}</p>

            {carregandoHorarios ? (
              <p>Carregando horários...</p>
            ) : (
              <>
                <div className="horarios-scroll-wrapper">
                  <div className="horarios-lista">
                    {horarios.map(({ horario, disponivel }) => (
                      <button
                        key={horario}
                        disabled={!disponivel}
                        onClick={() => handleSelecionarHorario(horario)}
                        className={[
                          'horario-btn',
                          !disponivel ? 'horario-btn-desabilitado' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {horario}
                        {!disponivel && (
                          <span className="horario-btn-label-ocupado">Ocupado</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dica de scroll — visível só em desktop */}
                <p className="horarios-dica-scroll">← deslize para ver mais →</p>
              </>
            )}
          </div>
        )}

        {/* FORMULÁRIO */}
        {etapaAtual === 'formulario' && dataSelecionada && horarioSelecionado && (
          <div className="sistema-card">
            <button className="btn-voltar" onClick={() => setEtapaAtual('horarios')}>
              ← Voltar
            </button>

            <h2 className="sistema-section-title">Seus Dados</h2>
            <p className="sistema-text-muted">
              {formatarDataCompleta(dataSelecionada)} às {horarioSelecionado}
            </p>

            <div className="formulario-form">
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="formulario-input"
              />

              <input
                type="text"
                placeholder="Sobrenome"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                className="formulario-input"
              />

              <input
                type="tel"
                placeholder="Telefone"
                value={telefone}
                onChange={(e) => {
                  let valor = e.target.value;
                  valor = valor
                    .replace(/\D/g, '')
                    .replace(/^(\d{2})(\d)/g, '($1) $2')
                    .replace(/(\d{5})(\d)/, '$1-$2')
                    .slice(0, 15);
                  setTelefone(valor);
                }}
                className="formulario-input"
              />

              {erroConfirmacao && (
                <p className="formulario-erro">{erroConfirmacao}</p>
              )}

              <div className="formulario-acoes">
                <button className="btn-secundario" onClick={() => setEtapaAtual('horarios')}>
                  ← Voltar
                </button>

                <button
                  className="btn-primario"
                  onClick={handleConfirmar}
                  disabled={confirmando || !nome || !sobrenome}
                >
                  {confirmando ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMAÇÃO */}
        {etapaAtual === 'confirmacao' && agendamentoConfirmado && (
          <div className="sistema-card">
            <button className="btn-voltar" onClick={() => setEtapaAtual('formulario')}>
              ← Voltar
            </button>

            <div className="confirmacao-icone">✓</div>

            <h2 className="confirmacao-titulo">Agendamento Confirmado!</h2>

            <div className="confirmacao-card">
              <p>
                <strong>Cliente:</strong>{' '}
                {agendamentoConfirmado.cliente.nome}{' '}
                {agendamentoConfirmado.cliente.sobrenome}
              </p>
              <p>
                <strong>Telefone:</strong>{' '}
                {agendamentoConfirmado.cliente.telefone}
              </p>
              <p>
                <strong>Data:</strong>{' '}
                {formatarDataCompleta(agendamentoConfirmado.data)}
              </p>
              <p>
                <strong>Horário:</strong>{' '}
                {agendamentoConfirmado.horario}
              </p>
              <p className="confirmacao-codigo">
                <strong>Código:</strong>{' '}
                {agendamentoConfirmado.codigoConfirmacao}
              </p>
            </div>

            <button className="btn-primario-confirmacao" onClick={handleNovoAgendamento}>
              Novo Agendamento
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PROGRESSO
// ============================================================

function IndicadorProgresso({ etapa }: { etapa: EtapaAgendamento }) {
  const passos = [
    { id: 'calendario', label: 'Data' },
    { id: 'horarios', label: 'Horário' },
    { id: 'formulario', label: 'Dados' },
  ];

  const indiceAtual = passos.findIndex((p) => p.id === etapa);

  return (
    <div className="progresso-wrapper">
      {passos.map((passo, i) => {
        const concluido = i < indiceAtual;
        const ativo = i === indiceAtual;

        return (
          <div key={passo.id} className="progresso-item">
            <div
              className={[
                'progresso-circulo',
                concluido ? 'progresso-circulo-concluido' : '',
                ativo ? 'progresso-circulo-ativo' : '',
              ].filter(Boolean).join(' ')}
            >
              {concluido ? '✓' : i + 1}
            </div>

            <span
              className={[
                'progresso-label',
                ativo ? 'progresso-label-ativo' : '',
              ].filter(Boolean).join(' ')}
            >
              {passo.label}
            </span>

            {i < passos.length - 1 && (
              <div
                className={[
                  'progresso-linha',
                  concluido ? 'progresso-linha-concluida' : '',
                ].filter(Boolean).join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}