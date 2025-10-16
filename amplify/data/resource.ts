import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
// amplify/data/resource.ts
/**
 * Schema de dados: Oferta (1) --- (N) Automacao
 * - ofertaId é opcional na Automacao (permite automações sem oferta vinculada)
 * - relações: hasMany / belongsTo
 * - auth: allow.guest() com identityPool (público). Ajuste depois conforme sua política.
 */

const schema = a.schema({
  Oferta: a
    .model({
      bsn: a.string().required(),
      nome: a.string().required(),
      tier: a.string().required(),
      status: a.string().required(),
      tipo: a.string().required(),
      comunidade: a.string().required(),
      criadoEm: a.datetime().required(),
      automacoes: a.hasMany('Automacao', 'ofertaId'),
    })
    .authorization((allow) => [allow.guest()]),

  Automacao: a
    .model({
      nome: a.string().required(),
      descricao: a.string().required(),
      categoria: a.string().required(),
      criadoEm: a.datetime().required(),
      ofertaId: a.id(), // FK opcional
      oferta: a.belongsTo('Oferta', 'ofertaId'),
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Mantém o modo padrão como 'identityPool' (público/guest). 
    // Depois você pode trocar para userPool e regras mais finas.
    defaultAuthorizationMode: 'identityPool',
  },
});


/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
