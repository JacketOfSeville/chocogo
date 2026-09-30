import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    senha: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    senha: z.ZodString;
}, z.core.$strip>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const userProfileUpdateSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodString>>;
    telefone: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const produtoCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    codigo_sku: z.ZodString;
    peso_gramas: z.ZodNumber;
    preco: z.ZodNumber;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const produtoUpdateSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    codigo_sku: z.ZodOptional<z.ZodString>;
    peso_gramas: z.ZodOptional<z.ZodNumber>;
    preco: z.ZodOptional<z.ZodNumber>;
    ativo: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const estoqueCreateSchema: z.ZodObject<{
    id_produto: z.ZodNumber;
    quantidade: z.ZodNumber;
    quantidade_min: z.ZodNumber;
}, z.core.$strip>;
export declare const estoqueUpdateSchema: z.ZodObject<{
    id_produto: z.ZodOptional<z.ZodNumber>;
    quantidade: z.ZodOptional<z.ZodNumber>;
    quantidade_min: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const carrinhoCreateSchema: z.ZodObject<{
    id_usuario: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const carrinhoUpdateSchema: z.ZodObject<{
    id_usuario: z.ZodNumber;
}, z.core.$strip>;
export declare const carrinhoCheckoutSchema: z.ZodObject<{
    id_endereco: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    id_status_pedido: z.ZodNumber;
    id_tipo_entrega: z.ZodNumber;
    meio_pagamento: z.ZodString;
    valor_frete: z.ZodNumber;
}, z.core.$strip>;
export declare const carrinhoItemCreateSchema: z.ZodObject<{
    id_carrinho: z.ZodNumber;
    id_produto: z.ZodNumber;
    quantidade: z.ZodNumber;
}, z.core.$strip>;
export declare const carrinhoItemUpdateSchema: z.ZodObject<{
    id_carrinho: z.ZodOptional<z.ZodNumber>;
    id_produto: z.ZodOptional<z.ZodNumber>;
    quantidade: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const enderecoCreateSchema: z.ZodObject<{
    id_usuario: z.ZodOptional<z.ZodNumber>;
    logradouro: z.ZodString;
    numero: z.ZodString;
    complemento: z.ZodOptional<z.ZodString>;
    bairro: z.ZodString;
    cidade: z.ZodString;
    cep: z.ZodString;
    principal: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const enderecoUpdateSchema: z.ZodObject<{
    id_usuario: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    logradouro: z.ZodOptional<z.ZodString>;
    numero: z.ZodOptional<z.ZodString>;
    complemento: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bairro: z.ZodOptional<z.ZodString>;
    cidade: z.ZodOptional<z.ZodString>;
    cep: z.ZodOptional<z.ZodString>;
    principal: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const usuarioRoleUpdateSchema: z.ZodObject<{
    id_tipo_usuario: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>]>;
}, z.core.$strip>;
export declare const categoriaCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const categoriaUpdateSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    descricao: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const produtoCategoriaCreateSchema: z.ZodObject<{
    id_produto: z.ZodNumber;
    id_categoria: z.ZodNumber;
}, z.core.$strip>;
export declare const produtoCategoriaUpdateSchema: z.ZodObject<{
    id_produto: z.ZodOptional<z.ZodNumber>;
    id_categoria: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const produtoImagemCreateSchema: z.ZodObject<{
    id_produto: z.ZodNumber;
    url: z.ZodString;
    ordem: z.ZodNumber;
    principal: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const produtoImagemUploadBodySchema: z.ZodObject<{
    id_produto: z.ZodCoercedNumber<unknown>;
    ordem: z.ZodCoercedNumber<unknown>;
    principal: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>, z.ZodTransform<boolean | undefined, string | boolean | undefined>>;
}, z.core.$strip>;
export declare const produtoImagemUpdateSchema: z.ZodObject<{
    id_produto: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodString>;
    ordem: z.ZodOptional<z.ZodNumber>;
    principal: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const pedidoCreateSchema: z.ZodObject<{
    id_usuario: z.ZodOptional<z.ZodNumber>;
    id_endereco: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    id_status_pedido: z.ZodNumber;
    id_tipo_entrega: z.ZodNumber;
    pronto_retirada: z.ZodOptional<z.ZodBoolean>;
    entregue: z.ZodOptional<z.ZodBoolean>;
    meio_pagamento: z.ZodString;
    valor_total: z.ZodNumber;
    valor_frete: z.ZodNumber;
}, z.core.$strip>;
export declare const pedidoUpdateSchema: z.ZodObject<{
    id_usuario: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    id_endereco: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    id_status_pedido: z.ZodOptional<z.ZodNumber>;
    id_tipo_entrega: z.ZodOptional<z.ZodNumber>;
    pronto_retirada: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    entregue: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    meio_pagamento: z.ZodOptional<z.ZodString>;
    valor_total: z.ZodOptional<z.ZodNumber>;
    valor_frete: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const pushSubscriptionCreateSchema: z.ZodObject<{
    endpoint: z.ZodString;
    keys: z.ZodObject<{
        p256dh: z.ZodString;
        auth: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const pushUnsubscribeSchema: z.ZodObject<{
    endpoint: z.ZodString;
}, z.core.$strip>;
export declare const pedidoItemCreateSchema: z.ZodObject<{
    id_pedido: z.ZodNumber;
    id_produto: z.ZodNumber;
    quantidade: z.ZodNumber;
    preco_momento: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const pedidoItemUpdateSchema: z.ZodObject<{
    id_pedido: z.ZodOptional<z.ZodNumber>;
    id_produto: z.ZodOptional<z.ZodNumber>;
    quantidade: z.ZodOptional<z.ZodNumber>;
    preco_momento: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
//# sourceMappingURL=validation.d.ts.map