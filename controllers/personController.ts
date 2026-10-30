import type { Response } from "express";

import {
  getAllCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from "../models/personModel";

import type { AuthRequest } from "../middleware/authMiddleware";

type PersonData = {
  name: string;
  email: string;
  address: string;
  phone: string;
};

function validatePersonData(body: PersonData) {
  const { name, email, address, phone } = body;

  if (!name || !email || !address || !phone) {
    return null;
  }

  return {
    name: name.trim(),
    email: email.trim(),
    address: address.trim(),
    phone: phone.trim(),
  };
}

function getParamId(req: AuthRequest) {
  const paramId = req.params.id;
  return Array.isArray(paramId) ? paramId[0] : paramId;
}

export async function getCustomers(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (req.query.all === "true") {
      const customers = await getAllCustomers(userId);
      return res
        .status(200)
        .json({ customers, totalCount: customers.totalCount });
    }

    const requestedPage = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 4;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const page = Math.max(1, Math.floor(requestedPage));
    const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit)));

    const results = await getAllCustomers(userId, page, limit, search);

    return res.status(200).json({
      ...results,
      page,
      limit,
      search,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not fetch customers",
    });
  }
}

export async function createCustomer(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = validatePersonData(req.body);

    if (!data) {
      return res.status(400).json({ error: "Invalid customer data" });
    }

    const customer = await addCustomer(data, req.user.id);
    return res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Email already in use.Try another email" });
  }
}

export async function editCustomer(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const id = getParamId(req);

    if (!id) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const data = validatePersonData(req.body);

    if (!data) {
      return res.status(400).json({ error: "Invalid customer data" });
    }

    const customer = await updateCustomer(id, data, req.user.id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Email already in use. Try another email" });
  }
}

export async function removeCustomer(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const id = getParamId(req);

    if (!id) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const customer = await deleteCustomer(id, req.user.id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503" || error.cause?.code === "23503") {
      return res.status(409).json({
        error:
          "Cannot delete this customer because transactions are associated with them.",
      });
    }

    return res.status(500).json({ error: "Could not delete customer" });
  }
}

export async function getSuppliers(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.query.all === "true") {
      const suppliers = await getAllSuppliers(userId);
      return res
        .status(200)
        .json({ suppliers, totalCount: suppliers.totalCount });
    }

    const requestedPage = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 4;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const page = Math.max(1, Math.floor(requestedPage));
    const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit)));

    const results = await getAllSuppliers(userId, page, limit, search);

    return res.status(200).json({
      ...results,
      page,
      limit,
      search,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not fetch suppliers",
    });
  }
}

export async function createSupplier(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = validatePersonData(req.body);

    if (!data) {
      return res.status(400).json({ error: "Invalid supplier data" });
    }

    const supplier = await addSupplier(data, req.user.id);
    return res.status(201).json(supplier);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not add supplier" });
  }
}

export async function editSupplier(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const id = getParamId(req);

    if (!id) {
      return res.status(400).json({ error: "Supplier ID is required" });
    }

    const data = validatePersonData(req.body);

    if (!data) {
      return res.status(400).json({ error: "Invalid supplier data" });
    }

    const supplier = await updateSupplier(id, data, req.user.id);

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    return res.status(200).json(supplier);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not update supplier" });
  }
}

export async function removeSupplier(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const id = getParamId(req);

    if (!id) {
      return res.status(400).json({ error: "Supplier ID is required" });
    }

    const supplier = await deleteSupplier(id, req.user.id);

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    return res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Could not delete supplier because it has transations" });
  }
}
