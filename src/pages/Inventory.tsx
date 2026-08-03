"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Car,
  Search,
  RefreshCcw,
  Plus,
  X,
  PencilLine,
  CheckCircle2,
  CircleX,
  Upload,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

type Vehicle = {
  id: string;
  external_id: string;
  category: string;
  make: string;
  model: string;
  base_model: string;
  title_clean: string;
  year: number;
  fabric_year: number;
  mileage: number;
  fuel: string;
  gear: string;
  motor: string;
  doors: number | null;
  color: string;
  price: number;
  promo_price: number | null;
  plate_final: string | null;
  images_large: string[] | null;
  available: boolean | null;
  description_clean: string | null;
  options_clean: string | null;
  search_text: string | null;
  last_update_xml: string | null;
  created_at: string;
  updated_at: string;
  version: string | null;
  plate: string | null;
};

type CatalogType = "category" | "make" | "model" | "base_model";

type CatalogItem = {
  id: string;
  catalog_type: CatalogType;
  category: string;
  make: string;
  model: string;
  base_model: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

type FormState = {
  external_id: string;
  category: string;
  category_mode: "existing" | "custom";
  category_custom: string;
  make: string;
  model: string;
  base_model: string;
  title_clean: string;
  year: string;
  fabric_year: string;
  mileage: string;
  fuel: string;
  gear: string;
  motor: string;
  doors: string;
  color: string;
  price: string;
  promo_price: string;
  plate: string;
  plate_final: string;
  images_large_text: string;
  available: boolean;
  description_clean: string;
  options_clean: string;
  version: string;
};

const emptyForm = (): FormState => ({
  external_id: "",
  category: "",
  category_mode: "existing",
  category_custom: "",
  make: "",
  model: "",
  base_model: "",
  title_clean: "",
  year: "",
  fabric_year: "",
  mileage: "",
  fuel: "",
  gear: "",
  motor: "",
  doors: "",
  color: "",
  price: "",
  promo_price: "",
  plate: "",
  plate_final: "",
  images_large_text: "",
  available: true,
  description_clean: "",
  options_clean: "",
  version: "",
});

const formatMoney = (value: any) => {
  const numberValue = Number(value || 0);
  if (!numberValue) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
};

const normalizeText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizePlate = (value: string) =>
  String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();

const parseImagesText = (value: string) => {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getVehicleImage = (vehicle: Vehicle) => {
  const img = vehicle?.images_large?.[0];
  return img || "https://placehold.co/800x450?text=Sem+Foto";
};

const uniqueSorted = (items: string[]) =>
  Array.from(
    new Set(items.map((item) => String(item || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

const withCurrent = (current: string, list: string[]) =>
  uniqueSorted(current ? [...list, current] : [...list]);

const Inventory = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement | null>(null);

  const role = (localStorage.getItem("auth_role") || "").trim().toLowerCase();
  const isAuthenticated = localStorage.getItem("is_authenticated") === "true";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogSaving, setCatalogSaving] = useState(false);

  const [novoCatalogo, setNovoCatalogo] = useState({
    category: "",
    make: "",
    model: "",
    base_model: "",
  });

  const [novoAtributo, setNovoAtributo] = useState({
    fuel: "",
    gear: "",
    color: "",
    version: "",
  });

  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [placaBusca, setPlacaBusca] = useState("");
  const [marcaBusca, setMarcaBusca] = useState("");
  const [modeloBusca, setModeloBusca] = useState("");
  const [statusBusca, setStatusBusca] = useState<"all" | "active" | "inactive">(
    "all"
  );

  const [form, setForm] = useState<FormState>(emptyForm());

  const allowedRoles = [
    "lojista",
    "gerente",
    "admin",
    "adm",
    "administrador",
    "vendedor",
  ];

  const canAccess = allowedRoles.includes(role);
  const canEditInventory = role !== "vendedor";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!canAccess) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, canAccess, navigate]);

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const gerarProximoExternalId = (list: Vehicle[]) => {
    const numeros = list
      .map((item) => {
        const match = String(item.external_id || "").match(/joinha-(\d+)/i);
        return match ? Number(match[1]) : 0;
      })
      .filter((n) => Number.isFinite(n) && n > 0);

    const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
    return `joinha-${String(proximo).padStart(4, "0")}`;
  };

  const carregarVehicles = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("vehicles_joinha")
        .select("*")
        .order("available", { ascending: false })
        .order("make", { ascending: true })
        .order("model", { ascending: true })
        .order("year", { ascending: false });

      if (error) throw error;

      const list = (data || []) as Vehicle[];
      setVehicles(list);
      setFilteredVehicles(list);
    } catch (error: any) {
      console.error("Erro ao carregar estoque:", error);
      showError(error?.message || "Não foi possível carregar o estoque.");
    } finally {
      setLoading(false);
    }
  };

  const carregarCatalogo = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("vehicles_joinha_catalog")
        .select("*")
        .eq("active", true)
        .order("catalog_type", { ascending: true })
        .order("category", { ascending: true })
        .order("make", { ascending: true })
        .order("model", { ascending: true })
        .order("base_model", { ascending: true });

      if (error) throw error;

      setCatalogItems((data || []) as CatalogItem[]);
    } catch (error: any) {
      console.error("Erro ao carregar catálogo:", error);
      showError(error?.message || "Não foi possível carregar o catálogo.");
    }
  };

  useEffect(() => {
    if (canAccess) {
      carregarVehicles();
      carregarCatalogo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  const categorias = useMemo(
    () =>
      uniqueSorted(
        catalogItems
          .filter((item) => item.catalog_type === "category")
          .map((item) => item.category || "")
      ),
    [catalogItems]
  );

  const marcas = useMemo(
    () =>
      uniqueSorted(
        catalogItems
          .filter((item) => item.catalog_type === "make")
          .map((item) => item.make || "")
      ),
    [catalogItems]
  );

  const modelos = useMemo(
    () =>
      uniqueSorted(
        catalogItems
          .filter((item) => item.catalog_type === "model")
          .map((item) => item.model || "")
      ),
    [catalogItems]
  );

  const vehiclesDoCatalogoAtivo = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const category = normalizeText(vehicle.category || "");
      const make = normalizeText(vehicle.make || "");
      const model = normalizeText(vehicle.model || "");
      const baseModel = normalizeText(vehicle.base_model || "");

      const hasCategory = catalogItems.some(
        (item) =>
          item.catalog_type === "category" &&
          normalizeText(item.category || "") === category
      );

      if (!hasCategory) return false;

      const hasMake = catalogItems.some(
        (item) =>
          item.catalog_type === "make" &&
          normalizeText(item.category || "") === category &&
          normalizeText(item.make || "") === make
      );

      if (!hasMake) return false;

      const hasModel = catalogItems.some(
        (item) =>
          item.catalog_type === "model" &&
          normalizeText(item.category || "") === category &&
          normalizeText(item.make || "") === make &&
          normalizeText(item.model || "") === model
      );

      if (!hasModel) return false;

      const hasBaseModel = catalogItems.some(
        (item) =>
          item.catalog_type === "base_model" &&
          normalizeText(item.category || "") === category &&
          normalizeText(item.make || "") === make &&
          normalizeText(item.model || "") === model &&
          normalizeText(item.base_model || "") === baseModel
      );

      if (!hasBaseModel) return false;

      return true;
    });
  }, [vehicles, catalogItems]);

  const totalVeiculos = useMemo(
    () => vehiclesDoCatalogoAtivo.length,
    [vehiclesDoCatalogoAtivo]
  );

  const veiculosAtivos = useMemo(
    () =>
      vehiclesDoCatalogoAtivo.filter((item) => item.available !== false).length,
    [vehiclesDoCatalogoAtivo]
  );

  const veiculosInativos = useMemo(
    () =>
      vehiclesDoCatalogoAtivo.filter((item) => item.available === false).length,
    [vehiclesDoCatalogoAtivo]
  );

  const fuels = useMemo(
    () => uniqueSorted(vehicles.map((item) => item.fuel)),
    [vehicles]
  );

  const gears = useMemo(
    () => uniqueSorted(vehicles.map((item) => item.gear)),
    [vehicles]
  );

  const colors = useMemo(
    () => uniqueSorted(vehicles.map((item) => item.color)),
    [vehicles]
  );

  const versions = useMemo(
    () => uniqueSorted(vehicles.map((item) => item.version || "")),
    [vehicles]
  );

  const marcasDaCategoriaForm = useMemo(() => {
    return uniqueSorted(
      catalogItems
        .filter(
          (item) =>
            item.catalog_type === "make" &&
            normalizeText(item.category || "") === normalizeText(form.category)
        )
        .map((item) => item.make || "")
    );
  }, [catalogItems, form.category]);

  const modelosDaCategoriaEMarcaForm = useMemo(() => {
    return uniqueSorted(
      catalogItems
        .filter(
          (item) =>
            item.catalog_type === "model" &&
            normalizeText(item.category || "") === normalizeText(form.category) &&
            normalizeText(item.make || "") === normalizeText(form.make)
        )
        .map((item) => item.model || "")
    );
  }, [catalogItems, form.category, form.make]);

  const baseModelsDaCategoriaMarcaModeloForm = useMemo(() => {
    return uniqueSorted(
      catalogItems
        .filter(
          (item) =>
            item.catalog_type === "base_model" &&
            normalizeText(item.category || "") === normalizeText(form.category) &&
            normalizeText(item.make || "") === normalizeText(form.make) &&
            normalizeText(item.model || "") === normalizeText(form.model)
        )
        .map((item) => item.base_model || "")
    );
  }, [catalogItems, form.category, form.make, form.model]);

  const modelosDaMarcaFiltro = useMemo(() => {
    if (!marcaBusca) return modelos;

    return uniqueSorted(
      catalogItems
        .filter(
          (item) =>
            item.catalog_type === "model" &&
            normalizeText(item.make || "") === normalizeText(marcaBusca)
        )
        .map((item) => item.model || "")
    );
  }, [catalogItems, marcaBusca, modelos]);

  useEffect(() => {
    if (!marcaBusca) return;
    if (modeloBusca && !modelosDaMarcaFiltro.includes(modeloBusca)) {
      setModeloBusca("");
    }
  }, [marcaBusca, modeloBusca, modelosDaMarcaFiltro]);

  const aplicarFiltros = () => {
    const placaNorm = normalizePlate(placaBusca);

    let lista = [...vehiclesDoCatalogoAtivo];

    if (placaNorm) {
      lista = lista.filter((item) =>
        normalizePlate(String(item.plate || "")).includes(placaNorm)
      );
    } else {
      if (marcaBusca) {
        lista = lista.filter(
          (item) => normalizeText(item.make) === normalizeText(marcaBusca)
        );
      }

      if (modeloBusca) {
        lista = lista.filter(
          (item) => normalizeText(item.model) === normalizeText(modeloBusca)
        );
      }
    }

    if (statusBusca === "active") {
      lista = lista.filter((item) => item.available !== false);
    }

    if (statusBusca === "inactive") {
      lista = lista.filter((item) => item.available === false);
    }

    setFilteredVehicles(lista);
  };

  useEffect(() => {
    aplicarFiltros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehiclesDoCatalogoAtivo,
    placaBusca,
    marcaBusca,
    modeloBusca,
    statusBusca,
  ]);

  const limparFiltros = () => {
    setPlacaBusca("");
    setMarcaBusca("");
    setModeloBusca("");
    setStatusBusca("all");
  };

  const abrirCadastro = () => {
    if (!canEditInventory) return;

    setEditingVehicle(null);

    const primeiraCategoria = categorias[0] || "";

    setForm({
      ...emptyForm(),
      external_id: gerarProximoExternalId(vehicles),
      category: primeiraCategoria,
      category_mode: "existing",
      category_custom: primeiraCategoria,
      make: "",
      model: "",
      base_model: "",
      available: true,
    });

    setCadastroAberto(true);
    scrollToForm();
  };

  const abrirEdicao = (vehicle: Vehicle) => {
    if (!canEditInventory) return;

    const categoryExists = categorias.some(
      (item) => normalizeText(item) === normalizeText(vehicle.category)
    );

    setEditingVehicle(vehicle);
    setForm({
      external_id: vehicle.external_id || "",
      category: vehicle.category || "",
      category_mode: categoryExists ? "existing" : "custom",
      category_custom: vehicle.category || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      base_model: vehicle.base_model || "",
      title_clean: vehicle.title_clean || "",
      year: String(vehicle.year ?? ""),
      fabric_year: String(vehicle.fabric_year ?? ""),
      mileage: String(vehicle.mileage ?? ""),
      fuel: vehicle.fuel || "",
      gear: vehicle.gear || "",
      motor: vehicle.motor || "",
      doors:
        vehicle.doors === null || vehicle.doors === undefined
          ? ""
          : String(vehicle.doors),
      color: vehicle.color || "",
      price: String(vehicle.price ?? ""),
      promo_price:
        vehicle.promo_price === null || vehicle.promo_price === undefined
          ? ""
          : String(vehicle.promo_price),
      plate: vehicle.plate || "",
      plate_final: vehicle.plate_final || "",
      images_large_text: (vehicle.images_large || []).join("\n"),
      available: vehicle.available !== false,
      description_clean: vehicle.description_clean || "",
      options_clean: vehicle.options_clean || "",
      version: vehicle.version || "",
    });
    setCadastroAberto(true);
    scrollToForm();
  };

  const fecharCadastro = () => {
    if (saving || catalogSaving) return;
    setCadastroAberto(false);
    setEditingVehicle(null);
  };

  const atualizarCampo = (campo: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [campo]: value }));
  };

  const getCategoriaAtual = () => {
    return form.category.trim();
  };

  const normalizarValorCatalogo = (type: CatalogType, value: string) => {
    const clean = value.trim();

    if (type === "make") return clean.toUpperCase();
    if (type === "model") return clean.toLowerCase();
    if (type === "base_model") return clean.toLowerCase();

    return clean;
  };

  const aplicarNovoAtributo = (campo: "fuel" | "gear" | "color" | "version") => {
    if (!canEditInventory) return;

    const value = novoAtributo[campo].trim();

    if (!value) {
      showError("Digite uma nova opção.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      [campo]: value,
    }));

    setNovoAtributo((prev) => ({
      ...prev,
      [campo]: "",
    }));

    showSuccess("Opção aplicada no veículo. Ao salvar, ela ficará disponível.");
  };

  const criarItemCatalogo = async (type: CatalogType) => {
    if (!canEditInventory) return;

    const category = getCategoriaAtual();
    const make = form.make.trim();
    const model = form.model.trim();

    const rawValue = novoCatalogo[type]?.trim();
    const value = normalizarValorCatalogo(type, rawValue);

    if (!value) return showError("Digite o nome do item.");

    if (type !== "category" && !category) {
      return showError("Selecione uma categoria antes.");
    }

    if ((type === "model" || type === "base_model") && !make) {
      return showError("Selecione uma marca antes.");
    }

    if (type === "base_model" && !model) {
      return showError("Selecione um modelo antes.");
    }

    const itemCategory = type === "category" ? value : category;
    const itemMake = type === "category" ? "" : type === "make" ? value : make;
    const itemModel =
      type === "category" || type === "make"
        ? ""
        : type === "model"
        ? value
        : model;
    const itemBaseModel = type === "base_model" ? value : "";

    const exists = catalogItems.some((item) => {
      if (item.catalog_type !== type) return false;

      const sameCategory =
        normalizeText(item.category || "") === normalizeText(itemCategory);

      const sameMake =
        type === "category" ||
        normalizeText(item.make || "") === normalizeText(itemMake);

      const sameModel =
        type === "category" ||
        type === "make" ||
        normalizeText(item.model || "") === normalizeText(itemModel);

      const sameBase =
        type !== "base_model" ||
        normalizeText(item.base_model || "") === normalizeText(itemBaseModel);

      return sameCategory && sameMake && sameModel && sameBase;
    });

    if (exists) {
      return showError("Esse item já existe no catálogo.");
    }

    try {
      setCatalogSaving(true);

      const now = new Date().toISOString();

      const payload = {
        catalog_type: type,
        category: itemCategory || "",
        make: itemMake || "",
        model: itemModel || "",
        base_model: itemBaseModel || "",
        active: true,
        created_at: now,
        updated_at: now,
      };

      const { error } = await (supabase as any)
        .from("vehicles_joinha_catalog")
        .insert(payload);

      if (error) throw error;

      setNovoCatalogo((prev) => ({
        ...prev,
        [type]: "",
      }));

      setForm((prev) => {
        if (type === "category") {
          return {
            ...prev,
            category_mode: "existing",
            category: value,
            category_custom: value,
            make: "",
            model: "",
            base_model: "",
          };
        }

        if (type === "make") {
          return {
            ...prev,
            make: value,
            model: "",
            base_model: "",
          };
        }

        if (type === "model") {
          return {
            ...prev,
            model: value,
            base_model: "",
          };
        }

        return {
          ...prev,
          base_model: value,
        };
      });

      await carregarCatalogo();

      showSuccess("Item criado no catálogo.");
    } catch (error: any) {
      console.error("Erro ao criar item do catálogo:", error);
      showError(error?.message || "Não foi possível criar o item.");
    } finally {
      setCatalogSaving(false);
    }
  };

  const deletarItemCatalogo = async (type: CatalogType) => {
    if (!canEditInventory) return;

    const category = getCategoriaAtual();
    const make = form.make.trim();
    const model = form.model.trim();
    const baseModel = form.base_model.trim();

    if (type === "category" && !category) {
      return showError("Selecione uma categoria para excluir.");
    }

    if (type === "make" && !make) {
      return showError("Selecione uma marca para excluir.");
    }

    if (type === "model" && !model) {
      return showError("Selecione um modelo para excluir.");
    }

    if (type === "base_model" && !baseModel) {
      return showError("Selecione um modelo base para excluir.");
    }

    const confirmar = window.confirm(
      "Deseja excluir esse item do catálogo? Os veículos reais relacionados serão desativados, mas não apagados."
    );

    if (!confirmar) return;

    const idsParaDeletar = catalogItems
      .filter((item) => {
        const sameCategory =
          normalizeText(item.category || "") === normalizeText(category);

        if (type === "category") {
          return sameCategory;
        }

        const sameMake = normalizeText(item.make || "") === normalizeText(make);

        if (type === "make") {
          return sameCategory && sameMake;
        }

        const sameModel =
          normalizeText(item.model || "") === normalizeText(model);

        if (type === "model") {
          return sameCategory && sameMake && sameModel;
        }

        const sameBase =
          normalizeText(item.base_model || "") === normalizeText(baseModel);

        return sameCategory && sameMake && sameModel && sameBase;
      })
      .map((item) => item.id);

    if (idsParaDeletar.length === 0) {
      return showError("Item não encontrado no catálogo.");
    }

    try {
      setCatalogSaving(true);

      const now = new Date().toISOString();

      const { error } = await (supabase as any)
        .from("vehicles_joinha_catalog")
        .update({
          active: false,
          updated_at: now,
        })
        .in("id", idsParaDeletar);

      if (error) throw error;

      let updateVehiclesQuery = (supabase as any)
        .from("vehicles_joinha")
        .update({
          available: false,
          updated_at: now,
        });

      if (type === "category") {
        updateVehiclesQuery = updateVehiclesQuery.eq("category", category);
      }

      if (type === "make") {
        updateVehiclesQuery = updateVehiclesQuery
          .eq("category", category)
          .eq("make", make);
      }

      if (type === "model") {
        updateVehiclesQuery = updateVehiclesQuery
          .eq("category", category)
          .eq("make", make)
          .eq("model", model);
      }

      if (type === "base_model") {
        updateVehiclesQuery = updateVehiclesQuery
          .eq("category", category)
          .eq("make", make)
          .eq("model", model)
          .eq("base_model", baseModel);
      }

      const { error: vehicleUpdateError } = await updateVehiclesQuery;

      if (vehicleUpdateError) throw vehicleUpdateError;

      setForm((prev) => {
        if (type === "category") {
          return {
            ...prev,
            category: "",
            category_custom: "",
            make: "",
            model: "",
            base_model: "",
          };
        }

        if (type === "make") {
          return {
            ...prev,
            make: "",
            model: "",
            base_model: "",
          };
        }

        if (type === "model") {
          return {
            ...prev,
            model: "",
            base_model: "",
          };
        }

        return {
          ...prev,
          base_model: "",
        };
      });

      await Promise.all([carregarCatalogo(), carregarVehicles()]);

      showSuccess("Item removido do catálogo e veículos relacionados desativados.");
    } catch (error: any) {
      console.error("Erro ao excluir item do catálogo:", error);
      showError(error?.message || "Não foi possível excluir o item.");
    } finally {
      setCatalogSaving(false);
    }
  };

  const salvarVeiculo = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canEditInventory) {
      showError("Você não tem permissão para alterar o estoque.");
      return;
    }

    const external_id = form.external_id.trim();
    const category = form.category.trim();
    const make = form.make.trim().toUpperCase();
    const model = form.model.trim().toLowerCase();
    const base_model = form.base_model.trim().toLowerCase();
    const title_clean =
      form.title_clean.trim() || `${make} ${model}`.trim().toUpperCase();

    const year = Number(form.year);
    const fabric_year = Number(form.fabric_year);
    const mileage = Number(form.mileage);
    const price = Number(String(form.price).replace(",", "."));
    const promo_price = form.promo_price.trim()
      ? Number(String(form.promo_price).replace(",", "."))
      : null;
    const doors =
      form.doors.trim() === "" ? null : Number(String(form.doors).trim());

    const fuel = form.fuel.trim();
    const gear = form.gear.trim();
    const motor = form.motor.trim();
    const color = form.color.trim();

    if (!external_id) return showError("Informe o ID do veículo.");
    if (!category) return showError("Informe a categoria.");
    if (!make) return showError("Informe a marca.");
    if (!model) return showError("Informe o modelo.");
    if (!base_model) return showError("Informe o modelo base.");
    if (!title_clean) return showError("Informe o título.");
    if (!year || Number.isNaN(year))
      return showError("Informe o ano de referência.");
    if (!fabric_year || Number.isNaN(fabric_year))
      return showError("Informe o ano de fabricação.");
    if (!mileage || Number.isNaN(mileage))
      return showError("Informe a quilometragem.");
    if (!fuel) return showError("Informe o combustível.");
    if (!gear) return showError("Informe o câmbio.");
    if (!motor) return showError("Informe o motor.");
    if (!color) return showError("Informe a cor.");
    if (!price || Number.isNaN(price)) return showError("Informe o preço.");

    const categoryExists = catalogItems.some(
      (item) =>
        item.catalog_type === "category" &&
        normalizeText(item.category || "") === normalizeText(category)
    );

    const makeExists = catalogItems.some(
      (item) =>
        item.catalog_type === "make" &&
        normalizeText(item.category || "") === normalizeText(category) &&
        normalizeText(item.make || "") === normalizeText(make)
    );

    const modelExists = catalogItems.some(
      (item) =>
        item.catalog_type === "model" &&
        normalizeText(item.category || "") === normalizeText(category) &&
        normalizeText(item.make || "") === normalizeText(make) &&
        normalizeText(item.model || "") === normalizeText(model)
    );

    const baseModelExists = catalogItems.some(
      (item) =>
        item.catalog_type === "base_model" &&
        normalizeText(item.category || "") === normalizeText(category) &&
        normalizeText(item.make || "") === normalizeText(make) &&
        normalizeText(item.model || "") === normalizeText(model) &&
        normalizeText(item.base_model || "") === normalizeText(base_model)
    );

    if (!categoryExists) {
      return showError("Essa categoria não existe no catálogo ativo.");
    }

    if (!makeExists) {
      return showError("Essa marca não existe no catálogo ativo desta categoria.");
    }

    if (!modelExists) {
      return showError("Esse modelo não existe no catálogo ativo desta marca.");
    }

    if (!baseModelExists) {
      return showError("Esse modelo base não existe no catálogo ativo deste modelo.");
    }

    try {
      setSaving(true);

      const payload = {
        external_id,
        category,
        make,
        model,
        base_model,
        title_clean,
        year,
        fabric_year,
        mileage,
        fuel,
        gear,
        motor,
        doors,
        color,
        price,
        promo_price,
        plate_final: form.plate_final.trim() || null,
        images_large: parseImagesText(form.images_large_text),
        available: form.available,
        description_clean: form.description_clean.trim() || null,
        options_clean: form.options_clean.trim() || null,
        version: form.version.trim() || null,
        plate: form.plate.trim() || null,
        search_text: [
          external_id,
          category,
          make,
          model,
          base_model,
          title_clean,
          String(year),
          String(fabric_year),
          String(mileage),
          fuel,
          gear,
          motor,
          color,
          form.plate.trim(),
          form.plate_final.trim(),
          form.version.trim(),
        ]
          .filter(Boolean)
          .join(" "),
        updated_at: new Date().toISOString(),
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from("vehicles_joinha")
          .update(payload)
          .eq("id", editingVehicle.id);

        if (error) throw error;
        showSuccess("Veículo atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("vehicles_joinha").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        showSuccess("Veículo cadastrado com sucesso.");
      }

      setCadastroAberto(false);
      setEditingVehicle(null);
      setForm(emptyForm());
      await Promise.all([carregarVehicles(), carregarCatalogo()]);
    } catch (error: any) {
      console.error("Erro ao salvar veículo:", error);
      showError(error?.message || "Não foi possível salvar o veículo.");
    } finally {
      setSaving(false);
    }
  };

  const alterarStatus = async (vehicle: Vehicle, nextStatus: boolean) => {
    if (!canEditInventory) return;

    try {
      setTogglingId(vehicle.id);

      const { error } = await supabase
        .from("vehicles_joinha")
        .update({
          available: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);

      if (error) throw error;

      await carregarVehicles();

      showSuccess(
        nextStatus
          ? "Veículo ativado com sucesso."
          : "Veículo desativado com sucesso."
      );
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      showError(error?.message || "Não foi possível alterar o status do veículo.");
    } finally {
      setTogglingId(null);
    }
  };

  const formTitle = editingVehicle ? "Alterar veículo" : "Cadastrar veículo";

  const selectClass =
    "w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-[#d4af37]";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Estoque
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Gestão do estoque da Joinha. Ative, desative, cadastre ou altere
            veículos conforme necessário.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEditInventory && (
            <Button
              onClick={abrirCadastro}
              className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
            >
              <Plus size={16} className="mr-2" />
              Cadastrar veículo
            </Button>
          )}

          <Button
            onClick={() => {
              carregarVehicles();
              carregarCatalogo();
            }}
            variant="outline"
            className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
            disabled={loading}
          >
            <RefreshCcw size={16} className="mr-2" />
            Recarregar lista
          </Button>

          <Button
            onClick={() => navigate("/dashboard")}
            className="border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {cadastroAberto && canEditInventory && (
        <div ref={formRef} className="scroll-mt-24">
          <Card className="bg-[#101010] border-[#d4af37]/40 rounded-2xl">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{formTitle}</h2>
                  <p className="text-zinc-400 text-sm mt-2">
                    {editingVehicle
                      ? "Atualize os dados do veículo e ajuste o status no estoque."
                      : "Cadastre um novo veículo e escolha se ele estará ativo ou inativo no estoque."}
                  </p>
                </div>

                <Button
                  onClick={fecharCadastro}
                  variant="outline"
                  className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
                  disabled={saving || catalogSaving}
                >
                  <X size={16} className="mr-2" />
                  Fechar
                </Button>
              </div>

              <form onSubmit={salvarVeiculo} className="space-y-5">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Categoria
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={form.category}
                        onChange={(e) => {
                          const value = e.target.value;

                          setForm((prev) => ({
                            ...prev,
                            category_mode: "existing",
                            category: value,
                            category_custom: value,
                            make: "",
                            model: "",
                            base_model: "",
                          }));
                        }}
                        className={selectClass}
                        disabled={saving || catalogSaving}
                      >
                        <option value="">Selecione</option>
                        {withCurrent(form.category, categorias).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        onClick={() => deletarItemCatalogo("category")}
                        disabled={saving || catalogSaving || !form.category}
                        variant="outline"
                        className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                        title="Excluir categoria do catálogo"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={novoCatalogo.category}
                        onChange={(e) =>
                          setNovoCatalogo((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="Nova categoria"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={saving || catalogSaving}
                      />

                      <Button
                        type="button"
                        onClick={() => criarItemCatalogo("category")}
                        disabled={saving || catalogSaving}
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Criar categoria"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Marca
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={form.make}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            make: value,
                            model: "",
                            base_model: "",
                          }));
                        }}
                        className={selectClass}
                        disabled={saving || catalogSaving || !form.category}
                      >
                        <option value="">Selecione</option>
                        {withCurrent(form.make, marcasDaCategoriaForm).map(
                          (item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          )
                        )}
                      </select>

                      <Button
                        type="button"
                        onClick={() => deletarItemCatalogo("make")}
                        disabled={saving || catalogSaving || !form.make}
                        variant="outline"
                        className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                        title="Excluir marca do catálogo"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={novoCatalogo.make}
                        onChange={(e) =>
                          setNovoCatalogo((prev) => ({
                            ...prev,
                            make: e.target.value,
                          }))
                        }
                        placeholder="Nova marca"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={saving || catalogSaving || !form.category}
                      />

                      <Button
                        type="button"
                        onClick={() => criarItemCatalogo("make")}
                        disabled={saving || catalogSaving || !form.category}
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Criar marca"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Modelo
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={form.model}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            model: e.target.value,
                            base_model: "",
                          }))
                        }
                        className={selectClass}
                        disabled={
                          saving || catalogSaving || !form.category || !form.make
                        }
                      >
                        <option value="">Selecione</option>
                        {withCurrent(
                          form.model,
                          modelosDaCategoriaEMarcaForm
                        ).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        onClick={() => deletarItemCatalogo("model")}
                        disabled={saving || catalogSaving || !form.model}
                        variant="outline"
                        className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                        title="Excluir modelo do catálogo"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={novoCatalogo.model}
                        onChange={(e) =>
                          setNovoCatalogo((prev) => ({
                            ...prev,
                            model: e.target.value,
                          }))
                        }
                        placeholder="Novo modelo"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={
                          saving || catalogSaving || !form.category || !form.make
                        }
                      />

                      <Button
                        type="button"
                        onClick={() => criarItemCatalogo("model")}
                        disabled={
                          saving || catalogSaving || !form.category || !form.make
                        }
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Criar modelo"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Modelo base
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={form.base_model}
                        onChange={(e) =>
                          atualizarCampo("base_model", e.target.value)
                        }
                        className={selectClass}
                        disabled={
                          saving ||
                          catalogSaving ||
                          !form.category ||
                          !form.make ||
                          !form.model
                        }
                      >
                        <option value="">Selecione</option>
                        {withCurrent(
                          form.base_model,
                          baseModelsDaCategoriaMarcaModeloForm
                        ).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        onClick={() => deletarItemCatalogo("base_model")}
                        disabled={saving || catalogSaving || !form.base_model}
                        variant="outline"
                        className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                        title="Excluir modelo base do catálogo"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={novoCatalogo.base_model}
                        onChange={(e) =>
                          setNovoCatalogo((prev) => ({
                            ...prev,
                            base_model: e.target.value,
                          }))
                        }
                        placeholder="Novo modelo base"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={
                          saving ||
                          catalogSaving ||
                          !form.category ||
                          !form.make ||
                          !form.model
                        }
                      />

                      <Button
                        type="button"
                        onClick={() => criarItemCatalogo("base_model")}
                        disabled={
                          saving ||
                          catalogSaving ||
                          !form.category ||
                          !form.make ||
                          !form.model
                        }
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Criar modelo base"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Título limpo
                    </label>
                    <Input
                      value={form.title_clean}
                      onChange={(e) =>
                        atualizarCampo("title_clean", e.target.value)
                      }
                      placeholder="HONDA CIVIC EXR"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Ano referência
                    </label>
                    <Input
                      value={form.year}
                      onChange={(e) =>
                        atualizarCampo("year", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="2016"
                      inputMode="numeric"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Ano fabricação
                    </label>
                    <Input
                      value={form.fabric_year}
                      onChange={(e) =>
                        atualizarCampo(
                          "fabric_year",
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      placeholder="2015"
                      inputMode="numeric"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Quilometragem
                    </label>
                    <Input
                      value={form.mileage}
                      onChange={(e) =>
                        atualizarCampo("mileage", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="82000"
                      inputMode="numeric"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Combustível
                    </label>

                    <select
                      value={form.fuel}
                      onChange={(e) => atualizarCampo("fuel", e.target.value)}
                      className={selectClass}
                      disabled={saving}
                    >
                      <option value="">Selecione</option>
                      {withCurrent(form.fuel, fuels).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={novoAtributo.fuel}
                        onChange={(e) =>
                          setNovoAtributo((prev) => ({
                            ...prev,
                            fuel: e.target.value,
                          }))
                        }
                        placeholder="Novo combustível"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={saving}
                      />

                      <Button
                        type="button"
                        onClick={() => aplicarNovoAtributo("fuel")}
                        disabled={saving}
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Aplicar novo combustível"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Câmbio
                    </label>

                    <select
                      value={form.gear}
                      onChange={(e) => atualizarCampo("gear", e.target.value)}
                      className={selectClass}
                      disabled={saving}
                    >
                      <option value="">Selecione</option>
                      {withCurrent(form.gear, gears).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={novoAtributo.gear}
                        onChange={(e) =>
                          setNovoAtributo((prev) => ({
                            ...prev,
                            gear: e.target.value,
                          }))
                        }
                        placeholder="Novo câmbio"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={saving}
                      />

                      <Button
                        type="button"
                        onClick={() => aplicarNovoAtributo("gear")}
                        disabled={saving}
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Aplicar novo câmbio"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Motor
                    </label>
                    <Input
                      value={form.motor}
                      onChange={(e) => atualizarCampo("motor", e.target.value)}
                      placeholder="2.0"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Portas
                    </label>
                    <Input
                      value={form.doors}
                      onChange={(e) =>
                        atualizarCampo("doors", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="4"
                      inputMode="numeric"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Cor
                    </label>

                    <select
                      value={form.color}
                      onChange={(e) => atualizarCampo("color", e.target.value)}
                      className={selectClass}
                      disabled={saving}
                    >
                      <option value="">Selecione</option>
                      {withCurrent(form.color, colors).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={novoAtributo.color}
                        onChange={(e) =>
                          setNovoAtributo((prev) => ({
                            ...prev,
                            color: e.target.value,
                          }))
                        }
                        placeholder="Nova cor"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={saving}
                      />

                      <Button
                        type="button"
                        onClick={() => aplicarNovoAtributo("color")}
                        disabled={saving}
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Aplicar nova cor"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Preço
                    </label>
                    <Input
                      value={form.price}
                      onChange={(e) =>
                        atualizarCampo(
                          "price",
                          e.target.value.replace(/[^\d,.-]/g, "")
                        )
                      }
                      placeholder="78900"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Preço promocional
                    </label>
                    <Input
                      value={form.promo_price}
                      onChange={(e) =>
                        atualizarCampo(
                          "promo_price",
                          e.target.value.replace(/[^\d,.-]/g, "")
                        )
                      }
                      placeholder="Opcional"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Placa
                    </label>
                    <Input
                      value={form.plate}
                      onChange={(e) =>
                        atualizarCampo("plate", e.target.value.toUpperCase())
                      }
                      placeholder="FJR1A61"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Final da placa
                    </label>
                    <Input
                      value={form.plate_final}
                      onChange={(e) =>
                        atualizarCampo("plate_final", e.target.value)
                      }
                      placeholder="1"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Versão
                    </label>

                    <select
                      value={form.version}
                      onChange={(e) => atualizarCampo("version", e.target.value)}
                      className={selectClass}
                      disabled={saving}
                    >
                      <option value="">Selecione</option>
                      {withCurrent(form.version, versions).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={novoAtributo.version}
                        onChange={(e) =>
                          setNovoAtributo((prev) => ({
                            ...prev,
                            version: e.target.value,
                          }))
                        }
                        placeholder="Nova versão"
                        className="bg-zinc-900 border-zinc-800 text-white"
                        disabled={saving}
                      />

                      <Button
                        type="button"
                        onClick={() => aplicarNovoAtributo("version")}
                        disabled={saving}
                        className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        title="Aplicar nova versão"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Imagens
                    </label>
                    <Textarea
                      value={form.images_large_text}
                      onChange={(e) =>
                        atualizarCampo("images_large_text", e.target.value)
                      }
                      placeholder="Cole uma URL por linha"
                      className="bg-zinc-900 border-zinc-800 text-white min-h-[120px]"
                      disabled={saving}
                    />
                    <p className="text-xs text-zinc-500 flex items-center gap-2">
                      <Upload size={14} />
                      Uma URL de imagem por linha. Isso será salvo em
                      `images_large`.
                    </p>
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Opções / opcionais
                    </label>
                    <Textarea
                      value={form.options_clean}
                      onChange={(e) =>
                        atualizarCampo("options_clean", e.target.value)
                      }
                      placeholder="Ar-condicionado, direção elétrica..."
                      className="bg-zinc-900 border-zinc-800 text-white min-h-[100px]"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Descrição
                    </label>
                    <Textarea
                      value={form.description_clean}
                      onChange={(e) =>
                        atualizarCampo("description_clean", e.target.value)
                      }
                      placeholder="Descrição completa do veículo..."
                      className="bg-zinc-900 border-zinc-800 text-white min-h-[120px]"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                      Status do estoque
                    </label>
                    <select
                      value={form.available ? "true" : "false"}
                      onChange={(e) =>
                        atualizarCampo("available", e.target.value === "true")
                      }
                      className={selectClass}
                      disabled={saving}
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                    <p className="text-xs text-zinc-500">
                      Ativo = aparece para a IA. Inativo = fica salvo, mas não
                      entra na busca do agente.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={saving || catalogSaving}
                    className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                  >
                    {saving ? "Salvando alterações..." : "Salvar alterações"}
                  </Button>

                  {catalogSaving && (
                    <span className="text-sm text-zinc-400 self-center">
                      Atualizando catálogo...
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black border-zinc-800 rounded-2xl">
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Total
              </span>
              <Car size={18} className="text-[#d4af37]" />
            </div>
            <div className="text-4xl font-black text-white">{totalVeiculos}</div>
          </CardContent>
        </Card>

        <Card className="bg-black border-zinc-800 rounded-2xl">
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Ativos
              </span>
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <div className="text-4xl font-black text-emerald-400">
              {veiculosAtivos}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border-zinc-800 rounded-2xl">
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Inativos
              </span>
              <CircleX size={18} className="text-zinc-300" />
            </div>
            <div className="text-4xl font-black text-zinc-300">
              {veiculosInativos}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Placa
              </label>
              <Input
                value={placaBusca}
                onChange={(e) => setPlacaBusca(e.target.value.toUpperCase())}
                placeholder="Ex.: FJR1A61"
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Marca
              </label>
              <select
                value={marcaBusca}
                onChange={(e) => {
                  setMarcaBusca(e.target.value);
                  setModeloBusca("");
                }}
                className={selectClass}
              >
                <option value="">Todas</option>
                {marcas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Modelo
              </label>
              <select
                value={modeloBusca}
                onChange={(e) => setModeloBusca(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos</option>
                {modelosDaMarcaFiltro.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Status
              </label>
              <select
                value={statusBusca}
                onChange={(e) =>
                  setStatusBusca(e.target.value as "all" | "active" | "inactive")
                }
                className={selectClass}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={aplicarFiltros}
              className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
            >
              <Search size={16} className="mr-2" />
              Buscar
            </Button>

            <Button
              onClick={limparFiltros}
              variant="outline"
              className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
          <CardContent className="p-6 text-zinc-400">
            Carregando estoque...
          </CardContent>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
          <CardContent className="p-6 text-zinc-400">
            Nenhum veículo encontrado com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVehicles.map((vehicle) => {
            const isActive = vehicle.available !== false;
            const isToggling = togglingId === vehicle.id;

            return (
              <Card
                key={vehicle.id}
                className="bg-[#101010] border-zinc-800 rounded-2xl"
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-full lg:w-[260px] shrink-0">
                      <img
                        src={getVehicleImage(vehicle)}
                        alt={`${vehicle.make || ""} ${vehicle.model || ""}`}
                        className="w-full h-[170px] object-cover rounded-xl border border-zinc-800 bg-black"
                      />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-black text-white">
                              {vehicle.make || "-"} {vehicle.model || "-"}
                            </h2>

                            <Badge
                              className={cn(
                                "border",
                                isActive
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                              )}
                            >
                              {isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>

                          <p className="text-zinc-400 text-sm mt-1">
                            {vehicle.title_clean || "Sem título"}
                          </p>
                        </div>

                        {canEditInventory && (
                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={() => abrirEdicao(vehicle)}
                              variant="outline"
                              className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
                            >
                              <PencilLine size={16} className="mr-2" />
                              Alterar
                            </Button>

                            {isActive ? (
                              <Button
                                onClick={() => alterarStatus(vehicle, false)}
                                disabled={isToggling}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white font-black"
                              >
                                {isToggling ? "Processando..." : "Desativar"}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => alterarStatus(vehicle, true)}
                                disabled={isToggling}
                                className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                              >
                                {isToggling ? "Processando..." : "Ativar"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Placa
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.plate || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Ano
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.year || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Preço
                          </p>
                          <p className="text-white font-semibold">
                            {formatMoney(vehicle.promo_price || vehicle.price)}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Cor
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.color || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Combustível
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.fuel || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Câmbio
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.gear || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Motor
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.motor || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Portas
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.doors ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {vehicle.base_model && (
                          <span className="rounded-full border border-zinc-800 px-3 py-1">
                            Base: {vehicle.base_model}
                          </span>
                        )}
                        {vehicle.version && (
                          <span className="rounded-full border border-zinc-800 px-3 py-1">
                            Versão: {vehicle.version}
                          </span>
                        )}
                        {vehicle.category && (
                          <span className="rounded-full border border-zinc-800 px-3 py-1">
                            Categoria: {vehicle.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Inventory;