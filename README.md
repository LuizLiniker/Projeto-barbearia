# 💈 Sistema de Agendamento — Barbearia

Sistema web que permite clientes agendarem 
atendimentos online e o barbeiro gerenciar 
todos os agendamentos do dia em um painel admin.

## 🚀 Tecnologias

- Node.js
- Express
- Supabase (PostgreSQL)
- JWT (autenticação)
- bcrypt (criptografia de senhas)

## ⚙️ Funcionalidades

**Cliente**
- Cadastro e login
- Visualizar horários disponíveis
- Agendar atendimento
- Recuperação de senha

**Admin (Barbeiro)**
- Visualizar todos os agendamentos do dia
- Cancelar agendamentos
- Gerenciar disponibilidade

## 🔗 Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /usuarios | Lista usuários |
| POST | /usuarios | Cadastra usuário |
| POST | /login | Autenticação |
| GET | /me | Dados do usuário logado |
| PUT | /alterar-senha | Altera senha |
| POST | /forgot-password | Solicita recuperação de senha |
| POST | /reset-password | Redefine senha |
| GET | /api/disponibilidade | Horários disponíveis |
| POST | /api/agendamentos | Cria agendamento |
| GET | /api/agendamentos | Lista agendamentos |
| DELETE | /api/agendamentos/:id | Cancela agendamento |
| GET | /api/status | Status da API |

## 👨‍💻 Autor

Luiz Liniker  
[LinkedIn](www.linkedin.com/in/liniker-braz)
