import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { createRecipe, deleteRecipe, getRecipe, getRecipeCost, getRecipes, updateRecipe } from '../controllers/recipe.controller';

const router = Router();
router.use(authenticate);

router.get('/', getRecipes);
router.get('/:id/cost', getRecipeCost);
router.get('/:id', getRecipe);
router.post('/', authorize('ADMIN', 'PRODUCTION_MANAGER'), createRecipe);
router.put('/:id', authorize('ADMIN'), updateRecipe);
router.delete('/:id', authorize('ADMIN'), deleteRecipe);

export default router;
