#!/usr/bin/env node
/**
 * Hook Claude Code (UserPromptSubmit) : enregistre chaque prompt dans la base Notion
 * « Journal des prompts » de la page « Le Panier 241 ».
 *
 * Jeton Notion : variable d'environnement NOTION_TOKEN, ou fichier
 * %USERPROFILE%\.claude\notion-token.txt (une seule ligne, jamais dans le dépôt).
 * Sans jeton ou sans réseau, le prompt est gardé dans prompts-en-attente.jsonl
 * (même dossier) et envoyé au prochain prompt.
 * Le hook ne bloque jamais Claude Code : il sort toujours avec le code 0.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const DATABASE_ID = '3b532df7c56b414fb422d33e42d30590'
const PENDING = path.join(__dirname, 'prompts-en-attente.jsonl')
const NOTION_VERSION = '2022-06-28'

function readToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN.trim()
  try {
    return fs.readFileSync(path.join(os.homedir(), '.claude', 'notion-token.txt'), 'utf8').trim()
  } catch {
    return ''
  }
}

// Masque clés, jetons et mots de passe avant tout envoi.
function mask(t) {
  return t
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, '[masqué]')
    .replace(/\b(sk|pk|rk|sb|ghp|gho|ntn|secret|xox[abp])[-_][A-Za-z0-9_-]{16,}/g, '[masqué]')
    .replace(/\b[A-Za-z0-9]{40,}\b/g, '[masqué]')
    .replace(/((?:mots? de passe|password|mdp)\s*(?:est|:|=)\s*)\S+/gi, '$1[masqué]')
    .replace(/((?:mots? de passe|password|mdp)\s+)(?=\S*[\d!@#$%^&*])\S+/gi, '$1[masqué]')
}

function makeTitle(t) {
  const first = (t.split('\n').find((l) => l.trim()) || 'Prompt').replace(/^[#>*\-\s]+/, '').replace(/\s+/g, ' ').trim()
  if (first.length <= 80) return first
  const cut = first.slice(0, 80)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

function theme(t) {
  const s = t.toLowerCase()
  if (/prd|product manager|pr[ée]sentation|strat[ée]gie/.test(s)) return 'Produit'
  if (/vid[ée]o|tiktok|motion|ffmpeg|voix|remotion/.test(s)) return 'Vidéo'
  if (/s[ée]curit|rls|mot de passe|password|connexion/.test(s)) return 'Sécurité'
  if (/design|couleur|logo|ic[oô]ne|police|image|photo/.test(s)) return 'Design'
  if (/prix|produit|march[ée]|magasin|commer[çc]ant|quartier|cat[ée]gorie/.test(s)) return 'Contenu'
  if (/supabase|sql|github|vercel|d[ée]ploi|api|code|commande|script|bug/.test(s)) return 'Code'
  return 'Autre'
}

// Notion limite chaque bloc de texte à 2000 caractères et une page à 100 blocs.
function blocks(text) {
  const out = []
  for (let i = 0; i < text.length && out.length < 100; i += 1900) {
    out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: text.slice(i, i + 1900) } }] } })
  }
  return out
}

async function send(token, entry) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      parent: { database_id: DATABASE_ID },
      properties: {
        Titre: { title: [{ text: { content: makeTitle(entry.text) } }] },
        Date: { date: { start: entry.ts } },
        Thème: { select: { name: theme(entry.text) } },
        Source: { select: { name: 'Automatique' } },
        Session: { rich_text: [{ text: { content: entry.session } }] },
      },
      children: blocks(entry.text),
    }),
  })
  if (!res.ok) throw new Error(`Notion ${res.status}`)
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const data = JSON.parse(input || '{}')
  const raw = String(data.prompt || '').trim()
  if (!raw) return
  // Le dossier « fichiers claude » contient d'autres projets : on ne garde pas leurs prompts.
  if (/civil.?job/i.test(raw) || /civil-job-hunter/i.test(String(data.cwd || ''))) return

  const entry = { ts: new Date().toISOString(), session: String(data.session_id || '').slice(0, 8), text: mask(raw) }
  let queue = []
  try {
    queue = fs.readFileSync(PENDING, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  } catch {}
  queue.push(entry)

  const token = readToken()
  const left = []
  for (const e of queue) {
    if (!token) { left.push(e); continue }
    try { await send(token, e) } catch { left.push(e) }
  }
  if (left.length) fs.writeFileSync(PENDING, left.map((e) => JSON.stringify(e)).join('\n') + '\n')
  else if (fs.existsSync(PENDING)) fs.unlinkSync(PENDING)
}

main().catch(() => {}).finally(() => process.exit(0))
