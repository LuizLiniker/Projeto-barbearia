const express = require("express")

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

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})