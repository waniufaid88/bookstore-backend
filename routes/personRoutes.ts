import { Router } from "express";

import {
  getCustomers,
  createCustomer,
  editCustomer,
  removeCustomer,
  getSuppliers,
  createSupplier,
  editSupplier,
  removeSupplier,
} from "../controllers/personController";

const router = Router();

router.get("/customers", getCustomers);
router.post("/customers", createCustomer);
router.patch("/customers/:id", editCustomer);
router.delete("/customers/:id", removeCustomer);

router.get("/suppliers", getSuppliers);
router.post("/suppliers", createSupplier);
router.patch("/suppliers/:id", editSupplier);
router.delete("/suppliers/:id", removeSupplier);

export default router;
