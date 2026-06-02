const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const supabase = require("./db")

const app = express()

app.use(cors())
app.use(express.json())

// ============================================================
// MIDDLEWARE JWT
// ============================================================

function verificarToken(req, res, next) {

    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({
            erro: "Token não informado"
        })
    }

    const token = authHeader.split(" ")[1]

    try {

        const secret = process.env.JWT_SECRET

        const decoded = jwt.verify(token, secret)

        req.usuario = decoded

        next()

    } catch (err) {

        return res.status(401).json({
            erro: "Token inválido"
        })
    }
}

// ============================================================
// USUÁRIOS
// ============================================================

// LISTAR USUÁRIOS
app.get("/usuarios", async (req, res) => {

    const { data, error } = await supabase
        .from("usuarios")
        .select("*")

    if (error) {
        return res.status(500).json({
            erro: error.message
        })
    }

    res.json(data)
})

// CRIAR USUÁRIO
app.post("/usuarios", async (req, res) => {

    try {

        const {
            nome,
            email,
            senha,
            numero,
            tipo
        } = req.body

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: "Dados obrigatórios faltando"
            })
        }

        const hashDaSenha = await bcrypt.hash(senha, 10)

        const { data, error } = await supabase
            .from("usuarios")
            .insert([{ nome, email, senha: hashDaSenha, numero, tipo }])
            .select()

        if (error) {
            return res.status(500).json({
                erro: error.message
            })
        }

        const usuarioCriado = data[0]
        delete usuarioCriado.senha

        return res.status(201).json(usuarioCriado)

    } catch (err) {

        return res.status(500).json({
            erro: "Erro ao criar usuário"
        })
    }
})

// ============================================================
// LOGIN
// ============================================================

app.post("/login", async (req, res) => {

    try {

        const { email, senha } = req.body

        const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email)

        if (error) {
            return res.status(500).json({
                erro: error.message
            })
        }

        if (!data || data.length === 0) {
            return res.status(401).json({
                erro: "Email ou senha inválidos"
            })
        }

        const usuario = data[0]

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: "Email ou senha inválidos"
            })
        }

        const payload = {
            userId: usuario.id,
            tipoDeUsuario: usuario.tipo
        }

        const secret = process.env.JWT_SECRET

        const token = jwt.sign(payload, secret, { expiresIn: "7d" })

        delete usuario.senha

        return res.json({
            token,
            usuario,
            precisaTrocarSenha: usuario.senha_temporaria
        })

    } catch (err) {

        return res.status(500).json({
            erro: "Erro no login"
        })
    }
})

// ============================================================
// DISPONIBILIDADE
// ============================================================

// Regras de horário por dia da semana:
//   0 = Domingo  → fechado
//   1 = Segunda  → 14:00 - 21:00 (sem intervalo de almoço, pois começa às 14h)
//   2 = Terça    → 09:00 - 21:00 (intervalo 12:00-14:00)
//   3 = Quarta   → 09:00 - 21:00 (intervalo 12:00-14:00)
//   4 = Quinta   → 09:00 - 21:00 (intervalo 12:00-14:00)
//   5 = Sexta    → 08:00 - 21:00 (intervalo 12:00-14:00)
//   6 = Sábado   → 08:00 - 17:00 (sem intervalo)

function getConfiguracaoDia(diaSemana) {
    switch (diaSemana) {
        case 0: // Domingo
            return null // fechado

        case 1: // Segunda
            return { horaInicio: 14, minutoInicio: 0, horaFim: 21, temIntervalo: false }

        case 2: // Terça
        case 3: // Quarta
        case 4: // Quinta
            return { horaInicio: 9, minutoInicio: 0, horaFim: 21, temIntervalo: true }

        case 5: // Sexta
            return { horaInicio: 8, minutoInicio: 0, horaFim: 21, temIntervalo: true }

        case 6: // Sábado
            return { horaInicio: 8, minutoInicio: 0, horaFim: 17, temIntervalo: false }

        default:
            return null
    }
}

app.get("/api/disponibilidade", async (req, res) => {

    try {

        const { data } = req.query

        if (!data) {
            return res.status(400).json({
                erro: "Data não informada"
            })
        }

        const [ano, mes, dia] = data.split("-").map(Number)
        const diaSemana = new Date(ano, mes - 1, dia).getDay()

        const config = getConfiguracaoDia(diaSemana)

        if (!config) {
            return res.json([])
        }

        const inicio = `${data} 00:00:00`
        const fim = `${data} 23:59:59`

        const { data: agendamentos, error } = await supabase
            .from("agendamentos")
            .select("datetime")
            .gte("datetime", inicio)
            .lte("datetime", fim)

        if (error) {
            return res.status(500).json({
                erro: error.message
            })
        }

        const horarios = []
        let hora = config.horaInicio
        let minuto = config.minutoInicio
        const horaFinalMin = config.horaFim * 60

        while ((hora * 60 + minuto) < horaFinalMin) {

            const totalMinutos = hora * 60 + minuto

            // Intervalo de almoço 12:00-14:00 (apenas para dias que têm intervalo)
            const emIntervalo = config.temIntervalo &&
                totalMinutos >= 12 * 60 &&
                totalMinutos < 14 * 60

            if (!emIntervalo) {

                const horarioFormatado = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`

                const ocupado = agendamentos.some((agendamento) => {
                    const dataAgendada = new Date(agendamento.datetime)
                    const horaAgendada = dataAgendada.getHours().toString().padStart(2, "0")
                    const minutoAgendado = dataAgendada.getMinutes().toString().padStart(2, "0")
                    return `${horaAgendada}:${minutoAgendado}` === horarioFormatado
                })

                horarios.push({ horario: horarioFormatado, disponivel: !ocupado })
            }

            minuto += 35
            while (minuto >= 60) {
                minuto -= 60
                hora++
            }
        }

        return res.json(horarios)

    } catch (err) {

        console.log(err)
        return res.status(500).json({ erro: "Erro ao buscar disponibilidade" })
    }
})

// ============================================================
// CRIAR AGENDAMENTO
// ============================================================

app.post("/api/agendamentos", async (req, res) => {

    try {

        const { data, horario, cliente } = req.body

        if (!data || !horario || !cliente) {
            return res.status(400).json({ erro: "Dados incompletos" })
        }

        if (!cliente.nome?.trim()) {
            return res.status(400).json({ erro: "Nome inválido" })
        }

        const dataCompleta = `${data} ${horario}:00`

        const { data: agendamentoExistente, error: erroBusca } = await supabase
            .from("agendamentos")
            .select("*")
            .eq("datetime", dataCompleta)

        if (erroBusca) {
            return res.status(500).json({ erro: erroBusca.message })
        }

        if (agendamentoExistente && agendamentoExistente.length > 0) {
            return res.status(400).json({ mensagem: "Horário já ocupado" })
        }

        let clienteId = null

        const { data: usuarioExistente, error: erroUsuario } = await supabase
            .from("usuarios")
            .select("*")
            .ilike("nome", cliente.nome)
            .limit(1)

        if (erroUsuario) {
            return res.status(500).json({ erro: erroUsuario.message })
        }

        if (usuarioExistente && usuarioExistente.length > 0) {
            clienteId = usuarioExistente[0].id
        }

        const nomeCompleto = [cliente.nome, cliente.sobrenome]
            .filter(Boolean)
            .join(" ")
            .trim()

        const { data: novoAgendamento, error } = await supabase
            .from("agendamentos")
            .insert([{
                datetime: dataCompleta,
                cliente_id: clienteId,
                nome_cliente: nomeCompleto,
                telefone_cliente: cliente.telefone || null,
            }])
            .select()

        if (error) {
            return res.status(500).json({ erro: error.message })
        }

        const codigoConfirmacao =
            "#" + Math.random().toString(36).slice(2, 8).toUpperCase()

        return res.status(201).json({
            id: novoAgendamento[0].id,
            codigoConfirmacao
        })

    } catch (error) {

        console.log(error)
        return res.status(500).json({ erro: "Erro ao criar agendamento" })
    }
})

// ============================================================
// LISTAR AGENDAMENTOS
// ============================================================

app.get("/api/agendamentos", verificarToken, async (req, res) => {

    try {

        const { data: agendamentos, error } = await supabase
            .from("agendamentos")
            .select("id, datetime, nome_cliente, telefone_cliente")
            .order("datetime", { ascending: true })

        if (error) {
            return res.status(500).json({ erro: error.message })
        }

        return res.json(agendamentos)

    } catch (err) {

        return res.status(500).json({ erro: "Erro ao listar agendamentos" })
    }
})

// ============================================================
// CANCELAR AGENDAMENTO
// ============================================================

app.delete("/api/agendamentos/:id", verificarToken, async (req, res) => {

    try {

        const { id } = req.params

        const { error } = await supabase
            .from("agendamentos")
            .delete()
            .eq("id", id)

        if (error) {
            return res.status(500).json({ erro: error.message })
        }

        return res.json({ mensagem: "Agendamento cancelado" })

    } catch (err) {

        return res.status(500).json({ erro: "Erro ao cancelar agendamento" })
    }
})

// ============================================================
// STATUS BARBEARIA
// ============================================================

app.get("/api/status", (req, res) => {

    const agora = new Date()
    const hora = agora.getHours()
    const diaSemana = agora.getDay()

    let aberto = false

    if (diaSemana === 1) {
        // Segunda: abre às 14h
        aberto = hora >= 14 && hora < 21
    } else if (diaSemana >= 2 && diaSemana <= 4) {
        // Ter, Qua, Qui: abre às 9h
        aberto = hora >= 9 && hora < 21
    } else if (diaSemana === 5) {
        // Sexta: abre às 8h
        aberto = hora >= 8 && hora < 21
    } else if (diaSemana === 6) {
        // Sábado: abre às 8h, fecha às 17h
        aberto = hora >= 8 && hora < 17
    }
    // Domingo (0): permanece false

    return res.json({
        aberto,
        mensagem: aberto ? "Aberto Agora" : "Fechado"
    })
})

// ============================================================
// ALTERAR SENHA
// ============================================================

app.put("/alterar-senha", verificarToken, async (req, res) => {

    try {

        const { novaSenha } = req.body

        if (!novaSenha) {
            return res.status(400).json({ erro: "Nova senha obrigatória" })
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10)

        const { error } = await supabase
            .from("usuarios")
            .update({ senha: senhaHash, senha_temporaria: false })
            .eq("id", req.usuario.userId)

        if (error) {
            return res.status(500).json({ erro: error.message })
        }

        return res.json({ mensagem: "Senha alterada com sucesso" })

    } catch (err) {

        return res.status(500).json({ erro: "Erro ao alterar senha" })
    }
})

// ============================================================
// RECUPERAÇÃO DE SENHA
// ============================================================

const transporter = require("./mailer")

app.post("/forgot-password", async (req, res) => {

    try {

        const { email } = req.body

        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expira = new Date(Date.now() + 10 * 60 * 1000)

        const { data: user, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email)
            .single()

        if (error || !user) {
            return res.status(404).json({ erro: "Usuário não encontrado" })
        }

        await supabase
            .from("usuarios")
            .update({ reset_code: code, reset_expira: expira })
            .eq("id", user.id)

        await transporter.sendMail({
            from: `"Barbearia" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Código de recuperação de senha",
            html: `
        <div style="font-family: Arial;">
          <h2>Recuperação de Senha</h2>
          <p>Seu código é:</p>
          <h1 style="color:#d4af37">${code}</h1>
          <p>Ele expira em 10 minutos.</p>
        </div>
      `,
        })

        return res.json({ mensagem: "Código enviado para o email" })

    } catch (err) {

        console.log(err)
        return res.status(500).json({ erro: "Erro ao enviar email" })
    }
})

app.post("/reset-password", async (req, res) => {

    try {

        const { email, code, newPassword } = req.body

        const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email)

        if (error || !data || data.length === 0) {
            return res.status(404).json({ erro: "Usuário não encontrado" })
        }

        const user = data[0]

        if (user.reset_code !== code) {
            return res.status(400).json({ erro: "Código inválido" })
        }

        if (new Date(user.reset_expira) < new Date()) {
            return res.status(400).json({ erro: "Código expirado" })
        }

        const hash = await bcrypt.hash(newPassword, 10)

        await supabase
            .from("usuarios")
            .update({ senha: hash, reset_code: null, reset_expira: null, senha_temporaria: false })
            .eq("email", email)

        return res.json({ mensagem: "Senha alterada com sucesso" })

    } catch (err) {

        return res.status(500).json({ erro: "Erro ao resetar senha" })
    }
})

// ============================================================
// VALIDAR TOKEN
// ============================================================

app.get("/me", verificarToken, async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("usuarios")
            .select("id, nome, email, tipo")
            .eq("id", req.usuario.userId)
            .single()

        if (error || !data) {
            return res.status(401).json({ erro: "Usuário não encontrado" })
        }

        return res.json(data)

    } catch (err) {

        return res.status(500).json({ erro: "Erro ao verificar usuário" })
    }
})

// ============================================================
// SERVIDOR
// ============================================================

app.listen(3333, () => {
    console.log("Servidor rodando na porta 3333")
})