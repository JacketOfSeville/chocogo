import { z } from "zod";

const emailSchema = z.string().email("Formato de email inválido").trim();
const telefoneSchema = z
  .string()
  .trim()
  .min(8, "Telefone deve ter pelo menos 8 caracteres")
  .max(20, "Telefone deve ter no máximo 20 caracteres");

export const registerSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome é necessario").max(100),
    email: emailSchema.optional(),
    telefone: telefoneSchema.optional(),
    senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(72),
  })
  .refine((value) => Boolean(value.email || value.telefone), {
    message: "Informe ao menos email ou telefone",
    path: ["email"],
  });

export const loginSchema = z
  .object({
    email: emailSchema.optional(),
    telefone: telefoneSchema.optional(),
    senha: z.string().min(1, "Senha é necessária"),
  })
  .refine((value) => Boolean(value.email || value.telefone), {
    message: "Informe ao menos email ou telefone",
    path: ["email"],
  });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken é necessário"),
});

export const produtoCreateSchema = z.object({
  nome: z.string().trim().min(1, "nome é necessario").max(100),
  codigo_sku: z.string().trim().min(1, "codigo_sku é necessario").max(50),
  peso_gramas: z.number().int().min(0),
  preco: z.number().positive("preco deve ser maior que zero"),
  ativo: z.boolean().optional(),
});

export const produtoUpdateSchema = produtoCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const estoqueCreateSchema = z.object({
  id_produto: z.number().int().positive(),
  quantidade: z.number().int().min(0),
  quantidade_min: z.number().int().min(0),
});

export const estoqueUpdateSchema = estoqueCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const carrinhoCreateSchema = z.object({
  id_usuario: z.number().int().positive().optional(),
});

export const carrinhoUpdateSchema = z.object({
  id_usuario: z.number().int().positive(),
});

export const carrinhoCheckoutSchema = z.object({
  id_endereco: z.number().int().positive().nullable().optional(),
  id_status_pedido: z.number().int().positive(),
  id_tipo_entrega: z.number().int().positive(),
  meio_pagamento: z.string().trim().min(1).max(50),
  valor_frete: z.number().nonnegative(),
});

export const carrinhoItemCreateSchema = z.object({
  id_carrinho: z.number().int().positive(),
  id_produto: z.number().int().positive(),
  quantidade: z.number().int().min(1),
});

export const carrinhoItemUpdateSchema = carrinhoItemCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const enderecoCreateSchema = z.object({
  id_usuario: z.number().int().positive().optional(),
  logradouro: z.string().trim().min(1).max(150),
  numero: z.string().trim().min(1).max(10),
  complemento: z.string().trim().max(50).optional(),
  bairro: z.string().trim().min(1).max(50),
  cidade: z.string().trim().min(1).max(50),
  cep: z.string().trim().min(8).max(9),
  principal: z.boolean().optional(),
});

export const enderecoUpdateSchema = enderecoCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const categoriaCreateSchema = z.object({
  nome: z.string().trim().min(1).max(50),
  descricao: z.string().trim().optional(),
});

export const categoriaUpdateSchema = categoriaCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const produtoCategoriaCreateSchema = z.object({
  id_produto: z.number().int().positive(),
  id_categoria: z.number().int().positive(),
});

export const produtoCategoriaUpdateSchema = produtoCategoriaCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const produtoImagemCreateSchema = z.object({
  id_produto: z.number().int().positive(),
  url: z.string().trim().min(1).max(254),
  ordem: z.number().int().min(0),
  principal: z.boolean().optional(),
});

export const produtoImagemUploadBodySchema = z.object({
  id_produto: z.coerce.number().int().positive(),
  ordem: z.coerce.number().int().min(0),
  principal: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean" || value === undefined) {
        return value;
      }

      return value.toLowerCase() === "true";
    }),
});

export const produtoImagemUpdateSchema = produtoImagemCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const pedidoCreateSchema = z.object({
  id_usuario: z.number().int().positive().optional(),
  id_endereco: z.number().int().positive().nullable().optional(),
  id_status_pedido: z.number().int().positive(),
  id_tipo_entrega: z.number().int().positive(),
  pronto_retirada: z.boolean().optional(),
  entregue: z.boolean().optional(),
  meio_pagamento: z.string().trim().min(1).max(50),
  valor_total: z.number().nonnegative(),
  valor_frete: z.number().nonnegative(),
});

export const pedidoUpdateSchema = pedidoCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);

export const pedidoItemCreateSchema = z.object({
  id_pedido: z.number().int().positive(),
  id_produto: z.number().int().positive(),
  quantidade: z.number().int().min(1),
  preco_momento: z.number().nonnegative().optional(),
});

export const pedidoItemUpdateSchema = pedidoItemCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualização" },
);
