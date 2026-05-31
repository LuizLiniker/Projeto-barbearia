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

app.get("/api/disponibilidade", async (req, res) => {

    try {

        const { data } = req.query

        if (!data) {
            return res.status(400).json({
                erro: "Data não informada"
            })
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
        let hora = 8
        let minuto = 0
        const horaFinal = 19

        while (hora < horaFinal) {

            const horarioFormatado = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`

            const ocupado = agendamentos.some((agendamento) => {
                const dataAgendada = new Date(agendamento.datetime)
                const horaAgendada = dataAgendada.getHours().toString().padStart(2, "0")
                const minutoAgendado = dataAgendada.getMinutes().toString().padStart(2, "0")
                return `${horaAgendada}:${minutoAgendado}` === horarioFormatado
            })

            horarios.push({ horario: horarioFormatado, disponivel: !ocupado })

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
app.get("/api/disponibilidade", async (req, res) => {

    try {

        const { data } = req.query

        if (!data) {
            return res.status(400).json({
                erro: "Data não informada"
            })
        }

        // Detecta o dia da semana (0 = domingo, 6 = sábado)
        const [ano, mes, dia] = data.split("-").map(Number)
        const diaSemana = new Date(ano, mes - 1, dia).getDay()

        if (diaSemana === 0) {
            return res.json([]) // Domingo fechado
        }

        const ehSabado = diaSemana === 6
        const horaFinal = ehSabado ? 17 : 21

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
        let hora = 8
        let minuto = 0

        while (hora < horaFinal) {

            const horarioFormatado = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`

            // Intervalo de almoço: pula de 12:00 até 14:00 (exclusive)
            const emIntervalo = hora === 12 || hora === 13

            if (!emIntervalo) {
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
    const aberto = hora >= 9 && hora < 19

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

const transporter = require("./mailer");

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 10 * 60 * 1000);

    const { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    await supabase
      .from("usuarios")
      .update({ reset_code: code, reset_expira: expira })
      .eq("id", user.id);

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
    });

    return res.json({ mensagem: "Código enviado para o email" });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ erro: "Erro ao enviar email" });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const user = data[0];

    if (user.reset_code !== code) {
      return res.status(400).json({ erro: "Código inválido" });
    }

    if (new Date(user.reset_expira) < new Date()) {
      return res.status(400).json({ erro: "Código expirado" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await supabase
      .from("usuarios")
      .update({ senha: hash, reset_code: null, reset_expira: null, senha_temporaria: false })
      .eq("email", email);

    return res.json({ mensagem: "Senha alterada com sucesso" });

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao resetar senha" });
  }
});

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