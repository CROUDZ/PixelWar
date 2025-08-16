import path from 'path';
import express from 'express';

interface RequestBody {
  action?: string;
  parameters?: any;
}

type HandlerFunction = (client: any, parameters?: any) => Promise<any>;

const router = express.Router();

router.post('/', async (req: any, res: any) => {
  const { action, parameters } = req.body as RequestBody;
  const client = req.app.locals.discordClient;

  console.log(`[API] Requête reçue pour l'action: ${action}`, parameters);

  if (!action) {
    return res
      .status(400)
      .json({ message: 'Action non spécifiée.', error: true });
  }

  try {
    const handlerPath = path.join(__dirname, '../handlers', `${action}.js`);
    const handler = require(handlerPath) as HandlerFunction;

    if (typeof handler !== 'function') {
      return res.status(500).json({
        message: `Le fichier ${action}.js ne contient pas de fonction valide.`,
        error: true,
      });
    }

    const result = await handler(client, parameters);
    res.json({ ...result });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({
      message: `Erreur lors de l'exécution de ${action}: ${errorMessage}`,
      error: true,
    });
  }
});

export default router;
