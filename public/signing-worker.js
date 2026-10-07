/* global createZsignModule, importScripts */

const runtimeVersion = 'wasm_chunked_cloudflare_v3'
const wasmParts = [
  'zsign-mobile.wasm.part-00',
  'zsign-mobile.wasm.part-01',
  'zsign-mobile.wasm.part-02',
  'zsign-mobile.wasm.part-03',
  'zsign-mobile.wasm.part-04',
  'zsign-mobile.wasm.part-05',
  'zsign-mobile.wasm.part-06',
  'zsign-mobile.wasm.part-07',
  'zsign-mobile.wasm.part-08',
]
const expectedWasmBytes = 2168107

async function loadWasmBinary() {
  const responses = await Promise.all(wasmParts.map((part) => fetch(`/wasm/${part}`)))
  const failed = responses.find((response) => !response.ok)
  if (failed) throw new Error(`Signing engine download failed (${failed.status}).`)
  const chunks = await Promise.all(responses.map(async (response) => new Uint8Array(await response.arrayBuffer())))
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  if (size !== expectedWasmBytes) throw new Error(`Signing engine download was incomplete (${size}/${expectedWasmBytes} bytes).`)
  const binary = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    binary.set(chunk, offset)
    offset += chunk.byteLength
  }
  if (!WebAssembly.validate(binary)) throw new Error('The downloaded signing engine is damaged. Refresh the page and try again.')
  return binary
}

function normalizePath(path) {
  const normalized = path.replaceAll('\\', '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function dirname(path) {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '/' : normalized.slice(0, index)
}

function basename(path) {
  return normalizePath(path).split('/').filter(Boolean).pop() || 'file'
}

function ensureDir(FS, path) {
  let current = ''
  for (const part of normalizePath(path).split('/').filter(Boolean)) {
    current += `/${part}`
    try {
      FS.mkdir(current)
    } catch (error) {
      if (error?.errno !== 20) throw error
    }
  }
}

function outputType(path) {
  return /\.(?:ipa|zip)$/i.test(path) ? 'application/zip' : 'application/octet-stream'
}

function cleanLine(value) {
  return String(value).replace(/\x1b\[[0-9;]*[mK]/g, '').trim()
}

self.onmessage = async (event) => {
  const request = event.data
  if (request?.type !== 'run') return
  const logs = []
  const transfers = []
  const emitLog = (value) => {
    const line = cleanLine(value)
    if (!line) return
    logs.push(line)
    self.postMessage({ id: request.id, type: 'log', ok: true, line })
  }

  try {
    importScripts(`/wasm/zsign-mobile.js?v=${runtimeVersion}`)
    const wasmBinary = await loadWasmBinary()
    const module = await createZsignModule({
      noInitialRun: true,
      wasmBinary,
      locateFile(file) {
        return `/wasm/${file}?v=${runtimeVersion}`
      },
      print: emitLog,
      printErr: emitLog,
    })
    const { FS } = module
    ensureDir(FS, '/blob')
    ensureDir(FS, '/output')
    ensureDir(FS, '/tmp')
    ensureDir(FS, '/work/.zsign_cache')
    FS.chdir('/work')

    const workerFiles = request.files.filter((file) => file.mode === 'workerfs')
    if (workerFiles.length) {
      FS.mount(
        module.WORKERFS,
        { blobs: workerFiles.map((file) => ({ name: basename(file.path), data: file.file })) },
        '/blob',
      )
    }
    for (const file of request.files.filter((entry) => entry.mode !== 'workerfs')) {
      const path = normalizePath(file.path)
      ensureDir(FS, dirname(path))
      FS.writeFile(path, new Uint8Array(await file.file.arrayBuffer()), { canOwn: true })
    }

    emitLog('>>> Mobile mode: classic worker with native zsign archive pipeline')
    let exitCode = 0
    try {
      const result = module.callMain(request.args)
      if (Number.isInteger(result)) exitCode = result
    } catch (error) {
      if (Number.isInteger(error?.status)) exitCode = error.status
      else throw error
    }

    const outputs = []
    for (const requestedPath of request.options.outputPaths || []) {
      const path = normalizePath(requestedPath)
      const node = FS.analyzePath(path).object
      if (!node?.contents) continue
      const usedBytes = Math.min(node.usedBytes ?? node.contents.byteLength, node.contents.byteLength)
      const data = node.contents.subarray(0, usedBytes)
      outputs.push({ path, name: basename(path), type: outputType(path), data })
      if (data.buffer instanceof ArrayBuffer) transfers.push(data.buffer)
    }

    self.postMessage(
      { id: request.id, type: 'done', ok: true, result: { exitCode, logs, outputs } },
      [...new Set(transfers)],
    )
  } catch (error) {
    self.postMessage({
      id: request.id,
      type: 'done',
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    })
  }
}
