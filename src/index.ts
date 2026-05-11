import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { authRoutes } from "./routes/authRoutes";
import { carrinhoItensRoutes } from "./routes/carrinhoItensRoutes";
import { carrinhoRoutes } from "./routes/carrinhoRoutes";
import { categoriaRoutes } from "./routes/categoriaRoutes";
import { enderecoRoutes } from "./routes/enderecoRoutes";
import { estoqueRoutes } from "./routes/estoqueRoutes";
import { pedidoItensRoutes } from "./routes/pedidoItensRoutes";
import { pedidoRoutes } from "./routes/pedidoRoutes";
import { produtoRoutes } from "./routes/produtoRoutes";
import { produtoCategoriaRoutes } from "./routes/produtoCategoriaRoutes";
import { produtoImagemRoutes } from "./routes/produtoImagemRoutes";
import { isApiError } from "./utils/errors";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.resolve(__dirname, "../uploads");
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// debug: loga detalhes de cada requisição recebida
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const payload: Record<string, unknown> = {
    timestamp,
    method: req.method,
    path: req.originalUrl,
  };

  if (Object.keys(req.query).length > 0) {
    payload.query = req.query;
  }

  if (Object.keys(req.params).length > 0) {
    payload.params = req.params;
  }

  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    payload.body = req.body;
  }

  console.log("Request recebido:", payload);
  next();
});
// debug

app.use("/uploads", express.static(uploadsPath));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/estoques", estoqueRoutes);
app.use("/api/carrinhos", carrinhoRoutes);
app.use("/api/carrinho-itens", carrinhoItensRoutes);
app.use("/api/enderecos", enderecoRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/pedido-itens", pedidoItensRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/produto-categorias", produtoCategoriaRoutes);
app.use("/api/produto-imagens", produtoImagemRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isApiError(error)) {
    res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: "Erro interno do servidor",
    statusCode: 500,
  });
});

const server = app.listen(port, () => {
  console.log(`Conectado ao Banco`);
  console.log(`API aberta na porta ${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} recebido. Desligando.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});