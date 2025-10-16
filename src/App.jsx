import { useEffect, useMemo, useRef, useState } from 'react'
import { generateClient } from 'aws-amplify/api'
import './App.css'

const client = generateClient()
const gql = String.raw

// ---------------- GraphQL (queries/mutações geradas pelo @model) ----------------
const LIST_OFERTAS = gql`
  query ListOfertas($limit: Int, $nextToken: String) {
    listOfertas(limit: $limit, nextToken: $nextToken) {
      items { id bsn nome tier status tipo comunidade criadoEm }
      nextToken
    }
  }
`
const CREATE_OFERTA = gql`
  mutation CreateOferta($input: CreateOfertaInput!) {
    createOferta(input: $input) {
      id bsn nome tier status tipo comunidade criadoEm
    }
  }
`
const UPDATE_OFERTA = gql`
  mutation UpdateOferta($input: UpdateOfertaInput!) {
    updateOferta(input: $input) {
      id bsn nome tier status tipo comunidade criadoEm
    }
  }
`
const DELETE_OFERTA = gql`
  mutation DeleteOferta($input: DeleteOfertaInput!) {
    deleteOferta(input: $input) { id }
  }
`

const LIST_AUTOMACAOS = gql`
  query ListAutomacaos($limit: Int, $nextToken: String) {
    listAutomacaos(limit: $limit, nextToken: $nextToken) {
      items { id nome descricao categoria criadoEm ofertaId }
      nextToken
    }
  }
`
const CREATE_AUTOMACAO = gql`
  mutation CreateAutomacao($input: CreateAutomacaoInput!) {
    createAutomacao(input: $input) {
      id nome descricao categoria criadoEm ofertaId
    }
  }
`
const UPDATE_AUTOMACAO = gql`
  mutation UpdateAutomacao($input: UpdateAutomacaoInput!) {
    updateAutomacao(input: $input) {
      id nome descricao categoria criadoEm ofertaId
    }
  }
`
const DELETE_AUTOMACAO = gql`
  mutation DeleteAutomacao($input: DeleteAutomacaoInput!) {
    deleteAutomacao(input: $input) { id }
  }
`

export default function App() {
  /* ----------------- AUTOMAÇÕES ----------------- */
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: '', ofertaBusca: '' })
  const [editId, setEditId] = useState(null)
  const [automacoes, setAutomacoes] = useState([])

  /* ----------------- OFERTAS ----------------- */
  const [ofertaForm, setOfertaForm] = useState({
    bsn: '', nome: '', tier: '', status: '', tipo: '', comunidade: '',
  })
  const [ofertaEditId, setOfertaEditId] = useState(null)
  const [ofertas, setOfertas] = useState([])

  /* ----------------- LOAD (AppSync) ----------------- */
  useEffect(() => {
    ;(async () => {
      await Promise.all([loadOfertas(), loadAutomacoes()])
    })()
  }, [])

  async function loadOfertas() {
    const acc = []
    let nextToken = null
    do {
      const res = await client.graphql({ query: LIST_OFERTAS, variables: { limit: 100, nextToken } })
      const { items, nextToken: nt } = res.data.listOfertas
      acc.push(...items)
      nextToken = nt
    } while (nextToken)
    // opcional: ordene por nome
    acc.sort((a,b)=>a.nome.localeCompare(b.nome))
    setOfertas(acc)
  }

  async function loadAutomacoes() {
    const acc = []
    let nextToken = null
    do {
      const res = await client.graphql({ query: LIST_AUTOMACAOS, variables: { limit: 100, nextToken } })
      const { items, nextToken: nt } = res.data.listAutomacaos
      acc.push(...items)
      nextToken = nt
    } while (nextToken)
    // mais recente primeiro
    acc.sort((a,b)=> new Date(b.criadoEm) - new Date(a.criadoEm))
    setAutomacoes(acc)
  }

  /* ----------------- AUTOMAÇÕES HANDLERS ----------------- */
  const isValidAuto = form.nome.trim() && form.descricao.trim() && form.categoria

  const handleAutoChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function ofertaById(id) { return ofertas.find(o => o.id === id) }
  function ofertaLabel(id) { const o = ofertaById(id); return o ? `${o.nome} (${o.bsn})` : '' }

  function resolveOfertaId(ofertaBusca) {
    const q = (ofertaBusca || '').trim().toLowerCase()
    if (!q) return ''
    const found = ofertas.find(o =>
      o.nome.toLowerCase() === q ||
      o.bsn.toLowerCase() === q ||
      o.nome.toLowerCase().includes(q) ||
      o.bsn.toLowerCase().includes(q)
    )
    return found ? found.id : ''
  }

  async function handleAutoSubmit(e) {
    e.preventDefault()
    if (!isValidAuto) return

    const ofertaId = resolveOfertaId(form.ofertaBusca)
    if (form.ofertaBusca && !ofertaId) {
      alert('Oferta associada não encontrada. Digite o Nome ou o ID BSN igual ao cadastrado ou deixe em branco.')
      return
    }

    if (editId) {
      // manter criadoEm existente
      const current = automacoes.find(a => a.id === editId)
      const res = await client.graphql({
        query: UPDATE_AUTOMACAO,
        variables: {
          input: {
            id: editId,
            nome: form.nome.trim(),
            descricao: form.descricao.trim(),
            categoria: form.categoria,
            ofertaId
          }
        }
      })
      const updated = res.data.updateAutomacao
      setAutomacoes(prev => prev.map(a => a.id === editId ? { ...current, ...updated } : a))
      setEditId(null)
    } else {
      const res = await client.graphql({
        query: CREATE_AUTOMACAO,
        variables: {
          input: {
            nome: form.nome.trim(),
            descricao: form.descricao.trim(),
            categoria: form.categoria,
            ofertaId,
            criadoEm: new Date().toISOString(),
          }
        }
      })
      const created = res.data.createAutomacao
      setAutomacoes(prev => [created, ...prev])
    }

    setForm({ nome: '', descricao: '', categoria: '', ofertaBusca: '' })
  }

  function handleAutoEdit(item) {
    const ofertaTexto = item.ofertaId ? ofertaLabel(item.ofertaId) : ''
    setEditId(item.id)
    setForm({
      nome: item.nome, descricao: item.descricao, categoria: item.categoria, ofertaBusca: ofertaTexto
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleAutoDelete(id) {
    if (!confirm('Confirma excluir esta automação?')) return
    await client.graphql({ query: DELETE_AUTOMACAO, variables: { input: { id } } })
    setAutomacoes(prev => prev.filter(a => a.id !== id))
    if (editId === id) {
      setEditId(null)
      setForm({ nome: '', descricao: '', categoria: '', ofertaBusca: '' })
    }
  }

  /* ----------------- OFERTAS HANDLERS ----------------- */
  const isValidOferta =
    ofertaForm.bsn.trim() && ofertaForm.nome.trim() &&
    ofertaForm.tier && ofertaForm.status && ofertaForm.tipo && ofertaForm.comunidade.trim()

  const handleOfertaChange = (e) => {
    const { name, value } = e.target
    setOfertaForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleOfertaSubmit(e) {
    e.preventDefault()
    if (!isValidOferta) return

    // Evita duplicar BSN
    const existsBsn = ofertas.some(o => o.bsn.trim().toLowerCase() === ofertaForm.bsn.trim().toLowerCase() && o.id !== ofertaEditId)
    if (existsBsn) { alert('Já existe uma oferta com esse ID BSN.'); return }

    if (ofertaEditId) {
      const res = await client.graphql({
        query: UPDATE_OFERTA,
        variables: {
          input: {
            id: ofertaEditId,
            bsn: ofertaForm.bsn.trim(),
            nome: ofertaForm.nome.trim(),
            tier: ofertaForm.tier,
            status: ofertaForm.status,
            tipo: ofertaForm.tipo,
            comunidade: ofertaForm.comunidade.trim(),
          }
        }
      })
      const updated = res.data.updateOferta
      setOfertas(prev => prev.map(o => o.id === ofertaEditId ? updated : o))
      setOfertaEditId(null)
    } else {
      const res = await client.graphql({
        query: CREATE_OFERTA,
        variables: {
          input: {
            bsn: ofertaForm.bsn.trim(),
            nome: ofertaForm.nome.trim(),
            tier: ofertaForm.tier,
            status: ofertaForm.status,
            tipo: ofertaForm.tipo,
            comunidade: ofertaForm.comunidade.trim(),
            criadoEm: new Date().toISOString(),
          }
        }
      })
      const created = res.data.createOferta
      setOfertas(prev => {
        const list = [...prev, created].sort((a,b)=>a.nome.localeCompare(b.nome))
        return list
      })
    }
    setOfertaForm({ bsn: '', nome: '', tier: '', status: '', tipo: '', comunidade: '' })
  }

  function handleOfertaEdit(o) {
    setOfertaEditId(o.id)
    setOfertaForm({
      bsn: o.bsn, nome: o.nome, tier: o.tier, status: o.status, tipo: o.tipo, comunidade: o.comunidade
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleOfertaDelete(id) {
    if (!confirm('Confirma excluir esta oferta?')) return
    // Desvincula automações que apontavam para ela
    const affected = automacoes.filter(a => a.ofertaId === id)
    for (const a of affected) {
      await client.graphql({ query: UPDATE_AUTOMACAO, variables: { input: { id: a.id, ofertaId: null } } })
    }
    await client.graphql({ query: DELETE_OFERTA, variables: { input: { id } } })
    setOfertas(prev => prev.filter(o => o.id !== id))
    setAutomacoes(prev => prev.map(a => a.ofertaId === id ? { ...a, ofertaId: null } : a))
    if (ofertaEditId === id) {
      setOfertaEditId(null)
      setOfertaForm({ bsn: '', nome: '', tier: '', status: '', tipo: '', comunidade: '' })
    }
  }

  /* ----------------- CSV (AUTOMAÇÕES) ----------------- */
  const csvData = useMemo(() => {
    const header = ['ID', 'Nome', 'Descricao', 'Categoria', 'Oferta', 'CriadoEm']
    const rows = automacoes.map(a => [
      a.id,
      sanitizeCSV(a.nome),
      sanitizeCSV(a.descricao),
      a.categoria,
      ofertaLabel(a.ofertaId),
      new Date(a.criadoEm || Date.now()).toISOString(),
    ])
    return [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
  }, [automacoes, ofertas])

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

  const fileInputRef = useRef(null)
  const handleImportClick = () => fileInputRef.current?.click()

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = String(reader.result || '')
        const rows = parseCSV(text) // [{Nome, Descricao, Categoria, Oferta?(nome ou BSN), CriadoEm?}]
        if (!rows.length) return alert('CSV vazio ou inválido.')

        const created = []
        for (const r of rows) {
          const nome = (r.Nome ?? r.nome ?? '').trim()
          const descricao = (r.Descricao ?? r.descricao ?? '').trim()
          const categoria = (r.Categoria ?? r.categoria ?? '').trim()
          const ofertaBusca = (r.Oferta ?? r.oferta ?? '').trim()
          const criadoEm = (r.CriadoEm ?? r.criadoem ?? '').trim()
          if (!nome || !descricao || !categoria) continue
          const ofertaId = resolveOfertaId(ofertaBusca)
          const res = await client.graphql({
            query: CREATE_AUTOMACAO,
            variables: {
              input: {
                nome, descricao, categoria,
                ofertaId: ofertaId || null,
                criadoEm: criadoEm || new Date().toISOString()
              }
            }
          })
          created.push(res.data.createAutomacao)
        }
        if (!created.length) return alert('Nenhuma linha válida encontrada.')
        setAutomacoes(prev => [...created, ...prev].sort((a,b)=> new Date(b.criadoEm) - new Date(a.criadoEm)))
        alert(`Importadas ${created.length} automações com sucesso!`)
      } catch (err) {
        console.error(err)
        alert('Falha ao importar CSV.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  /* ----------------- UI ----------------- */
  return (
    <>
      {/* Header */}
      <header className="container text-center">
        <h1 className="display-6">Portal de Automações</h1>
        <div className="card border-0 shadow-sm my-3">
          <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
            <p className="mb-0">+ moderno, + prático, + ágil, <strong>data-driven</strong></p>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-warning" onClick={handleImportClick}>
                <i className="bi bi-upload me-1" /> Importar automações (.csv)
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
            </div>
          </div>
        </div>
      </header>

      {/* --------- CADASTRAR OFERTA --------- */}
      <section className="container my-4">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex align-items-center justify-content-between">
            <h2 className="h5 mb-0">{ofertaEditId ? 'Editar Oferta' : 'Cadastrar Oferta'}</h2>
          </div>

          <div className="card-body">
            <form onSubmit={handleOfertaSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="form-floating">
                    <input id="bsn" name="bsn" type="text" className="form-control"
                      placeholder="ID BSN" value={ofertaForm.bsn} onChange={handleOfertaChange} required />
                    <label htmlFor="bsn">ID BSN da Oferta</label>
                  </div>
                </div>

                <div className="col-md-8">
                  <div className="form-floating">
                    <input id="nomeOferta" name="nome" type="text" className="form-control"
                      placeholder="Nome da Oferta" value={ofertaForm.nome} onChange={handleOfertaChange} required />
                    <label htmlFor="nomeOferta">Nome da Oferta</label>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="form-floating">
                    <select id="tier" name="tier" className="form-select"
                      value={ofertaForm.tier} onChange={handleOfertaChange} required>
                      <option value="" disabled>Selecione…</option>
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                    </select>
                    <label htmlFor="tier">Tier da Oferta</label>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="form-floating">
                    <select id="status" name="status" className="form-select"
                      value={ofertaForm.status} onChange={handleOfertaChange} required>
                      <option value="" disabled>Selecione…</option>
                      <option value="Ativa">Ativa</option>
                      <option value="Em Análise">Em Análise</option>
                      <option value="Suspensa">Suspensa</option>
                    </select>
                    <label htmlFor="status">Status da Oferta</label>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="form-floating">
                    <select id="tipo" name="tipo" className="form-select"
                      value={ofertaForm.tipo} onChange={handleOfertaChange} required>
                      <option value="" disabled>Selecione…</option>
                      <option value="Produto">Produto</option>
                      <option value="Serviço">Serviço</option>
                      <option value="Dados">Dados</option>
                      <option value="API">API</option>
                    </select>
                    <label htmlFor="tipo">Tipo da Oferta</label>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="form-floating">
                    <input id="comunidade" name="comunidade" type="text" className="form-control"
                      placeholder="Comunidade Responsável" value={ofertaForm.comunidade}
                      onChange={handleOfertaChange} required />
                    <label htmlFor="comunidade">Comunidade Responsável</label>
                  </div>
                </div>

                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={!isValidOferta}>
                    <i className="bi bi-save me-1" /> {ofertaEditId ? 'Salvar alterações' : 'Salvar'}
                  </button>
                  {ofertaEditId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => {
                      setOfertaEditId(null)
                      setOfertaForm({ bsn: '', nome: '', tier: '', status: '', tipo: '', comunidade: '' })
                    }}>
                      <i className="bi bi-x-circle me-1" /> Cancelar edição
                    </button>
                  )}
                  <button type="button" className="btn btn-light border" onClick={() =>
                    setOfertaForm({ bsn: '', nome: '', tier: '', status: '', tipo: '', comunidade: '' })
                  }>
                    <i className="bi bi-eraser me-1" /> Limpar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* --------- OFERTAS CADASTRADAS --------- */}
      <section className="container mb-5">
        <h2 className="h5 mb-2">Ofertas Cadastradas</h2>
        {ofertas.length === 0 ? (
          <p className="text-muted">Nenhuma oferta cadastrada.</p>
        ) : (
          <div className="table-responsive shadow-sm border rounded-3">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID BSN</th>
                  <th>Nome</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Tipo</th>
                  <th>Comunidade</th>
                  <th style={{ width: 170 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.map(o => (
                  <tr key={o.id}>
                    <td className="text-nowrap">{o.bsn}</td>
                    <td className="fw-medium">{o.nome}</td>
                    <td><span className="badge text-bg-secondary">{o.tier}</span></td>
                    <td><span className="badge text-bg-info">{o.status}</span></td>
                    <td>{o.tipo}</td>
                    <td className="text-nowrap">{o.comunidade}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleOfertaEdit(o)}>
                          <i className="bi bi-pencil-square me-1" /> Editar
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleOfertaDelete(o.id)}>
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

      {/* --------- CADASTRAR AUTOMAÇÃO --------- */}
      <section className="container my-4">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex align-items-center justify-content-between">
            <h2 className="h5 mb-0">{editId ? 'Editar Automação' : 'Cadastrar Automação'}</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary btn-sm" onClick={exportCSV} disabled={automacoes.length === 0} type="button">
                <i className="bi bi-download me-1" /> Exportar CSV
              </button>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleAutoSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="form-floating">
                    <input id="nome" name="nome" type="text" className="form-control"
                      placeholder="Nome da Automação" value={form.nome} onChange={handleAutoChange} required />
                    <label htmlFor="nome">Nome da Automação</label>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-floating">
                    <select id="categoria" name="categoria" className="form-select"
                      value={form.categoria} onChange={handleAutoChange} required>
                      <option value="" disabled>Selecione…</option>
                      <option value="AWS">AWS</option>
                      <option value="Low Code">Low Code</option>
                      <option value="A Definir">A Definir</option>
                    </select>
                    <label htmlFor="categoria">Categoria</label>
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-floating">
                    <textarea id="descricao" name="descricao" className="form-control" placeholder="Descrição da automação"
                      style={{ minHeight: 120 }} value={form.descricao} onChange={handleAutoChange} required />
                    <label htmlFor="descricao">Descrição da Automação</label>
                  </div>
                </div>

                {/* Oferta associada - combo pesquisável */}
                <div className="col-12">
                  <div className="form-floating">
                    <input
                      list="lista-ofertas"
                      id="ofertaBusca"
                      name="ofertaBusca"
                      type="text"
                      className="form-control"
                      placeholder="Oferta associada"
                      value={form.ofertaBusca}
                      onChange={handleAutoChange}
                    />
                    <label htmlFor="ofertaBusca">Oferta associada (digite Nome ou ID BSN)</label>

                    <datalist id="lista-ofertas">
                      {ofertas.map(o => (
                        <option key={o.id} value={o.nome}>{o.bsn}</option>
                      ))}
                      {ofertas.map(o => (
                        <option key={o.id + '-bsn'} value={o.bsn}>{o.nome}</option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={!isValidAuto}>
                    <i className="bi bi-save me-1" /> {editId ? 'Salvar alterações' : 'Salvar'}
                  </button>
                  {editId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => {
                      setEditId(null)
                      setForm({ nome: '', descricao: '', categoria: '', ofertaBusca: '' })
                    }}>
                      <i className="bi bi-x-circle me-1" /> Cancelar edição
                    </button>
                  )}
                  <button type="button" className="btn btn-light border" onClick={() =>
                    setForm({ nome: '', descricao: '', categoria: '', ofertaBusca: '' })
                  }>
                    <i className="bi bi-eraser me-1" /> Limpar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* --------- AUTOMAÇÕES CADASTRADAS --------- */}
      <section className="container mb-5">
        <h2 className="h5 mb-2">Automações Cadastradas</h2>
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
                  <th>Oferta Associada</th>
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
                    <td className="text-break">{ofertaLabel(a.ofertaId) || <span className="text-muted">—</span>}</td>
                    <td className="text-nowrap">{formatDate(a.criadoEm)}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleAutoEdit(a)}>
                          <i className="bi bi-pencil-square me-1" /> Editar
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleAutoDelete(a.id)}>
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
