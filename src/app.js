const express = require("express")
const bcrypt = require("bcryptjs") 
const supabase = require("./db")

const app = express()

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

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})