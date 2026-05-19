const express = require("express") // biblioteca para rotas
const bcrypt = require("bcryptjs") //biblioteca para criptografar senha
const jwt = require("jsonwebtoken") //biblioteca de token para autenticação tela de login
const cors = require("cors")
const supabase = require("./db")



const app = express()

app.use(cors())

app.use(express.json())

app.get("/usuarios", async (req,res) => {
    const {data, error} = await supabase
    .from("usuarios")
    .select("*")

    console.log("data:", data)
    console.log("error:", error)

    if(error) return res.status(500).json({ erro: error.message })

    res.json(data)
})

app.post("/usuarios", async(req,res) => {
    const {nome,email,senha,numero,tipo} = req.body //cria variaveis e guarda no banco de dados

    const hashDaSenha = await bcrypt.hash(senha, 10) // criptografa a senha

    const {data, error} = await supabase

    .from("usuarios")
    .insert([{nome: nome, email: email, senha: hashDaSenha, numero: numero, tipo: tipo}])
    .select()



    if(error) return res.status(500).json({ erro: error.message })//retorna erro
    const usuarioCriado = data[0] //remove a senha
    delete usuarioCriado.senha 
    return res.status(201).json(usuarioCriado)//retorna usuario criado

})

app.post("/login", async(req,res) =>{
    //pega email e senha no body
    const {email, senha} = req.body

    //busca usuario no banco de dados
    const {data, error} = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    //se não encontrar retorna erro
    if(!data || data.length === 0) return res.status(401).json({erro: "Email ou senha inválidos"})

    //comparar senha com hash
    const senhaCorreta = await bcrypt.compare(senha, data[0].senha)
    
    
    if(!senhaCorreta) return res.status(401).json({ erro: "Email ou senha inválidos" })
    
    //se não encontrar retorna erro
    if(error) return res.status(500).json({ erro: error.message })

    const payload = {
    userId: data[0].id,
    tipoDeUsuario: data[0].tipo
}

    const secret = process.env.JWT_SECRET
    const token = jwt.sign(payload, secret, {expiresIn: "7d"});

    res.json({ token })
    
})


app.listen(3333, () => {
    console.log("Servidor rodando na porta 3000")
})