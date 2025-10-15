import { useEffect, useMemo, useRef, useState } from 'react'
import autoguardiansLogo from './assets/autoguardians.svg' // troque para seu .gif se preferir
import './App.css'

export default function App() {
  // Formulário
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: '' })
  const [editId, setEditId] = useState(null)

  // Lista
  const [automacoes, setAutomacoes] = useState([])

  // Carregar/persistir
  useEffect(() => {
    const saved = localStorage.getItem('automacoes')
    if (saved) {
      try { setAutomacoes(JSON.parse(saved)) } catch { setAutomacoes([]) }
    }
  }, [])
  useEffect(() => {
    localStorage.setItem('automacoes', JSON.stringify(automacoes))
  }, [automacoes])

  const isValid = form.nome.trim() && form.descricao.trim() && form.categoria

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return

    if (editId) {
      setAutomacoes(prev =>
        prev.map(a => a.id === editId
          ? { ...a, nome: form.nome.trim(), descricao: form.descricao.trim(), categoria: form.categoria }
          : a
        )
      )
      setEditId(null)
    } else {
      const novo = {
        id: crypto.randomUUID(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        criadoEm: new Date().toISOString(),
      }
      setAutomacoes(prev => [novo, ...prev])
    }
    setForm({ nome: '', descricao: '', categoria: '' })
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setForm({ nome: item.nome, descricao: item.descricao, categoria: item.categoria })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditId(null)
    setForm({ nome: '', descricao: '', categoria: '' })
  }

  const handleDelete = (id) => {
    if (!confirm('Confirma excluir esta automação?')) return
    setAutomacoes(prev => prev.filter(a => a.id !== id))
    if (editId === id) handleCancelEdit()
  }

  // ---- Exportar CSV
  const csvData = useMemo(() => {
    const header = ['ID', 'Nome', 'Descricao', 'Categoria', 'CriadoEm']
    const rows = automacoes.map(a => [
      a.id,
      sanitizeCSV(a.nome),
      sanitizeCSV(a.descricao),
      a.categoria,
      new Date(a.criadoEm || Date.now()).toISOString(),
    ])
    return [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
  }, [automacoes])

  const exportCSV = () => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'automacoes.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ---- Importar CSV
  const fileInputRef = useRef(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const rows = parseCSV(text) // [{Nome, Descricao, Categoria, CriadoEm?}, ...]
        if (!rows.length) return alert('CSV vazio ou inválido.')

        const mapped = rows.map(r => {
          const nome = (r.Nome ?? r.nome ?? '').trim()
          const descricao = (r.Descricao ?? r.descricao ?? '').trim()
          const categoria = (r.Categoria ?? r.categoria ?? '').trim()
          if (!nome || !descricao || !categoria) return null
          const criadoEm = (r.CriadoEm ?? r.criadoem ?? '').trim()

          return {
            id: crypto.randomUUID(),
            nome,
            descricao,
            categoria,
            criadoEm: criadoEm || new Date().toISOString(),
          }
        }).filter(Boolean)

        if (!mapped.length) return alert('Nenhuma linha válida encontrada.')
        setAutomacoes(prev => [...mapped, ...prev])
        alert(`Importadas ${mapped.length} automações com sucesso!`)
      } catch (err) {
        console.error(err)
        alert('Falha ao importar CSV.')
      } finally {
        e.target.value = '' // permite reimportar o mesmo arquivo
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <>
      {/* Header / Hero */}
      <header className="container text-center">
        <img src={autoguardiansLogo} className="img-fluid my-3 logo" style={{ maxHeight: 96 }} alt="Autoguardians" />
        <h1 className="display-6">Portal de Automações</h1>
        <div className="card border-0 shadow-sm my-3">
          <div className="card-body d-flex flex-wrap align-items-center">
            <p className="mb-0">+ moderno, + prático, + ágil, <strong>data-driven</strong></p>

          </div>
        </div>
      </header>

      {/* Formulário */}
      <section className="container my-4">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex align-items-center justify-content-between">
            <h2 className="h5 mb-0">{editId ? 'Editar Automação' : 'Cadastrar Automação'}</h2>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={exportCSV}
                disabled={automacoes.length === 0}
                type="button"
              >
                <i className="bi bi-download me-1" /> Exportar CSV
              </button>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Nome */}
                <div className="col-md-6">
                  <div className="form-floating">
                    <input
                      id="nome"
                      name="nome"
                      type="text"
                      className="form-control"
                      placeholder="Nome da Automação"
                      value={form.nome}
                      onChange={handleChange}
                      required
                    />
                    <label htmlFor="nome">Nome da Automação</label>
                  </div>
                </div>

                {/* Categoria */}
                <div className="col-md-6">
                  <div className="form-floating">
                    <select
                      id="categoria"
                      name="categoria"
                      className="form-select"
                      value={form.categoria}
                      onChange={handleChange}
                      required
                    >
                      <option value="" disabled>Selecione...</option>
                      <option value="AWS">AWS</option>
                      <option value="Low Code">Low Code</option>
                      <option value="A Definir">A Definir</option>
                    </select>
                    <label htmlFor="categoria">Categoria</label>
                  </div>
                </div>

                {/* Descrição */}
                <div className="col-12">
                  <div className="form-floating">
                    <textarea
                      id="descricao"
                      name="descricao"
                      className="form-control"
                      placeholder="Descrição da automação"
                      style={{ minHeight: 120 }}
                      value={form.descricao}
                      onChange={handleChange}
                      required
                    />
                    <label htmlFor="descricao">Descrição da Automação</label>
                  </div>
                </div>

                {/* Ações */}
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={!isValid}>
                    <i className="bi bi-save me-1" /> {editId ? 'Salvar alterações' : 'Salvar'}
                  </button>
                  {editId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={handleCancelEdit}>
                      <i className="bi bi-x-circle me-1" /> Cancelar edição
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setForm({ nome: '', descricao: '', categoria: '' })}
                  >
                    <i className="bi bi-eraser me-1" /> Limpar
                  </button>

                  <div className="d-flex align-items-right gap-2">
              <button className="btn btn-warning" onClick={handleImportClick}>
                <i className="bi  " /> Clique para importar automações
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleImportFile}
              />
            </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Tabela */}
      <section className="container mb-5">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="h5 mb-0">Automações Cadastradas</h2>
        </div>

        {automacoes.length === 0 ? (
          <p className="text-muted">Nenhum registro ainda. Preencha o formulário e clique em <em>Salvar</em>.</p>
        ) : (
          <div className="table-responsive shadow-sm border rounded-3">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Criado em</th>
                  <th style={{ width: 170 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {automacoes.map(a => (
                  <tr key={a.id}>
                    <td className="fw-medium">{a.nome}</td>
                    <td className="text-break">{a.descricao}</td>
                    <td><span className="badge text-bg-info">{a.categoria}</span></td>
                    <td className="text-nowrap">{formatDate(a.criadoEm)}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(a)}>
                          <i className="bi bi-pencil-square me-1" /> Editar
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a.id)}>
                          <i className="bi bi-trash3 me-1" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="text-center text-muted mb-4">
        Desenvolvido por ®Autoguardians - 2025
      </footer>
    </>
  )
}

/* -------- utils -------- */
function formatDate(iso) {
  try { return new Date(iso).toLocaleString() } catch { return '-' }
}
function sanitizeCSV(s) {
  return String(s ?? '').replaceAll('\n', ' ')
}
function csvCell(val) {
  const s = String(val ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/* ===== CSV helpers ===== */
function parseCSV(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length)
  if (!lines.length) return []
  const headers = splitCSVLine(lines[0]).map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i])
    if (!cells.length) continue
    const row = {}
    headers.forEach((h, idx) => (row[h] = cells[idx] ?? ''))
    rows.push(row)
  }
  return rows
}
function splitCSVLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}
