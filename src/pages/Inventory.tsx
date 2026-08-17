"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
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

type FormOptionType =
  | "title_clean"
  | "fuel"
  | "gear"
  | "motor"
  | "color"
  | "version"
  | "optional";

type FormOptionItem = {
  id: string;
  option_type: FormOptionType;
  value: string;
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

type VehicleImageItem = {
  url: string;
  path: string | null;
};

type GalleryImage = {
  url: string;
  alt: string;
};

type GalleryModalState = {
  images: GalleryImage[];
  index: number;
} | null;

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

const uniquePreserve = (items: string[]) => {
  const seen = new Set<string>();

  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeText(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const parseOptionsText = (value: string) => {
  return uniquePreserve(
    String(value || "")
      .replace(/\r/g, "")
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
};

const buildOptionsText = (items: string[]) => uniquePreserve(items).join(", ");

const colorToHex = (color: string) => {
  const map: Record<string, string> = {
    azul: "1d4ed8",
    branco: "f8fafc",
    preto: "111827",
    prata: "cbd5e1",
    vermelho: "dc2626",
    vermelha: "dc2626",
    verde: "16a34a",
    cinza: "6b7280",
    "cinza escuro": "374151",
    bege: "d6b98c",
    marrom: "92400e",
    amarelo: "eab308",
  };

  return map[normalizeText(color)] || "525252";
};

const getVehicleImages = (vehicle: Vehicle) => {
  const existing = Array.isArray(vehicle.images_large)
    ? vehicle.images_large.filter(Boolean)
    : [];

  const label =
    `${vehicle.make || ""} ${vehicle.model || ""}`.trim() ||
    vehicle.title_clean ||
    "VEÍCULO";

  const text = encodeURIComponent(label.toUpperCase());
  const bg = colorToHex(vehicle.color || "");

  const placeholders = [
    "FRONTAL",
    "LATERAL",
    "TRASEIRA",
    "INTERIOR",
    "DETALHE 1",
    "DETALHE 2",
  ].map(
    (view) =>
      `https://placehold.co/800x450/${bg}/ffffff?text=${text}%20${encodeURIComponent(
        view
      )}`
  );

  return [...existing, ...placeholders].slice(0, 6);
};

const uniqueSorted = (items: string[]) =>
  Array.from(
    new Set(items.map((item) => String(item || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

const withCurrent = (current: string, list: string[]) =>
  uniqueSorted(current ? [...list, current] : [...list]);

const withManyCurrent = (current: string[], list: string[]) =>
  uniqueSorted([...list, ...current]);

const Inventory = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const role = (localStorage.getItem("auth_role") || "").trim().toLowerCase();
  const isAuthenticated = localStorage.getItem("is_authenticated") === "true";

  const [isClient, setIsClient] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogSaving, setCatalogSaving] = useState(false);

  const [formOptions, setFormOptions] = useState<FormOptionItem[]>([]);
  const [formOptionsSaving, setFormOptionsSaving] = useState(false);

  const [novoCatalogo, setNovoCatalogo] = useState({
    category: "",
    make: "",
    model: "",
    base_model: "",
  });

  const [novoAtributo, setNovoAtributo] = useState<Record<FormOptionType, string>>({
    title_clean: "",
    fuel: "",
    gear: "",
    motor: "",
    color: "",
    version: "",
    optional: "",
  });

  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [placaBusca, setPlacaBusca] = useState("");
  const [marcaBusca, setMarcaBusca] = useState("");
  const [modeloBusca, setModeloBusca] = useState("");
  const [statusBusca, setStatusBusca] = useState<"all" | "active" | "inactive">(
    "all"
  );

  const [vehicleImages, setVehicleImages] = useState<VehicleImageItem[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [galleryModal, setGalleryModal] = useState<GalleryModalState>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);

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
    setIsClient(true);
  }, []);

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

  const openGallery = (images: GalleryImage[], index = 0) => {
    if (!images.length) return;

    setGalleryModal({
      images,
      index,
    });
  };

  const closeGallery = () => {
    setGalleryModal(null);
  };

  const goToPrevImage = () => {
    setGalleryModal((prev) => {
      if (!prev || prev.images.length === 0) return prev;
      const nextIndex =
        prev.index === 0 ? prev.images.length - 1 : prev.index - 1;
      return { ...prev, index: nextIndex };
    });
  };

  const goToNextImage = () => {
    setGalleryModal((prev) => {
      if (!prev || prev.images.length === 0) return prev;
      const nextIndex =
        prev.index === prev.images.length - 1 ? 0 : prev.index + 1;
      return { ...prev, index: nextIndex };
    });
  };

  const goToImage = (index: number) => {
    setGalleryModal((prev) => {
      if (!prev) return prev;
      if (index < 0 || index >= prev.images.length) return prev;
      return { ...prev, index };
    });
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

  const syncImagesToForm = (images: VehicleImageItem[]) => {
    const limited = images.slice(0, 10);
    setVehicleImages(limited);
    setPreviewImageIndex(0);
    setForm((prev) => ({
      ...prev,
      images_large_text: limited.map((item) => item.url).join("\n"),
    }));
  };

  const syncSelectedOptionals = (items: string[]) => {
    const normalized = uniquePreserve(items);
    setSelectedOptionals(normalized);
    setForm((prev) => ({
      ...prev,
      options_clean: buildOptionsText(normalized),
    }));
  };

  const toggleOptional = (value: string) => {
    const exists = selectedOptionals.some(
      (item) => normalizeText(item) === normalizeText(value)
    );

    if (exists) {
      syncSelectedOptionals(
        selectedOptionals.filter(
          (item) => normalizeText(item) !== normalizeText(value)
        )
      );
      return;
    }

    syncSelectedOptionals([...selectedOptionals, value]);
  };

  const extractStoragePathFromUrl = (url: string) => {
    const bucket = "Vehicles-Joinha";
    const marker = `/storage/v1/object/public/${bucket}/`;

    const index = url.indexOf(marker);
    if (index === -1) return null;

    return decodeURIComponent(
      url
        .slice(index + marker.length)
        .split("?")[0]
        .split("#")[0]
        .trim()
    );
  };

  const getVehiclesCatalogoAtivo = (listaBase: Vehicle[]) => {
    return [...listaBase];
  };

  const filtrarVeiculos = (listaBase: Vehicle[]) => {
    const listaCatalogoAtivo = getVehiclesCatalogoAtivo(listaBase);
    const placaNorm = normalizePlate(placaBusca);

    let lista = [...listaCatalogoAtivo];

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

    return lista;
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
      setFilteredVehicles(filtrosAplicados ? filtrarVeiculos(list) : list);
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

  const carregarFormOptions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("vehicles_joinha_form_options")
        .select("*")
        .eq("active", true)
        .order("option_type", { ascending: true })
        .order("value", { ascending: true });

      if (error) throw error;

      setFormOptions((data || []) as FormOptionItem[]);
    } catch (error: any) {
      console.error("Erro ao carregar opções do formulário:", error);
      showError(error?.message || "Não foi possível carregar as opções do formulário.");
    }
  };

  useEffect(() => {
    if (canAccess) {
      carregarVehicles();
      carregarCatalogo();
      carregarFormOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  useEffect(() => {
    if (filtrosAplicados) {
      setFilteredVehicles(filtrarVeiculos(vehicles));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, catalogItems]);

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

  const titleCleanOptions = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "title_clean")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const fuels = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "fuel")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const gears = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "gear")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const motors = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "motor")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const colors = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "color")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const versions = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "version")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const optionalCatalogOptions = useMemo(
    () =>
      uniqueSorted(
        formOptions
          .filter((item) => item.option_type === "optional")
          .map((item) => item.value || "")
      ),
    [formOptions]
  );

  const optionalChoices = useMemo(
    () => withManyCurrent(selectedOptionals, optionalCatalogOptions),
    [selectedOptionals, optionalCatalogOptions]
  );

  const vehiclesDoCatalogoAtivo = useMemo(() => {
    return getVehiclesCatalogoAtivo(vehicles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!galleryModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscAndArrows = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowLeft") goToPrevImage();
      if (event.key === "ArrowRight") goToNextImage();
    };

    window.addEventListener("keydown", handleEscAndArrows);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscAndArrows);
    };
  }, [galleryModal]);

  const aplicarFiltros = () => {
    setFiltrosAplicados(true);
    setFilteredVehicles(filtrarVeiculos(vehicles));
  };

  const limparFiltros = () => {
    setPlacaBusca("");
    setMarcaBusca("");
    setModeloBusca("");
    setStatusBusca("all");
    setFiltrosAplicados(false);
    setFilteredVehicles(vehiclesDoCatalogoAtivo);
  };

  const resetImageState = () => {
    setVehicleImages([]);
    setPreviewImageIndex(0);
    setUploadingImages(false);
  };

  const resetNovoAtributo = () => {
    setNovoAtributo({
      title_clean: "",
      fuel: "",
      gear: "",
      motor: "",
      color: "",
      version: "",
      optional: "",
    });
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

    syncSelectedOptionals([]);
    resetImageState();
    resetNovoAtributo();
    setCadastroAberto(true);
    scrollToForm();
  };

  const abrirEdicao = (vehicle: Vehicle) => {
    if (!canEditInventory) return;

    const categoryExists = categorias.some(
      (item) => normalizeText(item) === normalizeText(vehicle.category)
    );

    const existingImages = (vehicle.images_large || [])
      .filter(Boolean)
      .map((url) => ({
        url,
        path: null,
      }));

    const parsedOptionals = parseOptionsText(vehicle.options_clean || "");

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
      images_large_text: existingImages.map((item) => item.url).join("\n"),
      available: vehicle.available !== false,
      description_clean: vehicle.description_clean || "",
      options_clean: buildOptionsText(parsedOptionals),
      version: vehicle.version || "",
    });
    setVehicleImages(existingImages);
    setPreviewImageIndex(0);
    syncSelectedOptionals(parsedOptionals);
    resetNovoAtributo();
    setCadastroAberto(true);
    scrollToForm();
  };

  const fecharCadastro = () => {
    if (saving || catalogSaving || formOptionsSaving) return;
    setCadastroAberto(false);
    setEditingVehicle(null);
    syncSelectedOptionals([]);
    resetImageState();
    resetNovoAtributo();
  };

  const atualizarCampo = (campo: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [campo]: value }));
  };

  const getCategoriaAtual = () => form.category.trim();

  const normalizarValorCatalogo = (type: CatalogType, value: string) => {
    const clean = value.trim();
    if (type === "make") return clean.toUpperCase();
    if (type === "model") return clean.toLowerCase();
    if (type === "base_model") return clean.toLowerCase();
    return clean;
  };

  const normalizarValorFormOption = (type: FormOptionType, value: string) => {
    const clean = value.trim();
    if (type === "title_clean") return clean.toUpperCase();
    return clean;
  };

  const getCurrentFormOptionValue = (type: Exclude<FormOptionType, "optional">) => {
    if (type === "title_clean") return form.title_clean;
    if (type === "fuel") return form.fuel;
    if (type === "gear") return form.gear;
    if (type === "motor") return form.motor;
    if (type === "color") return form.color;
    return form.version;
  };

  const setCurrentFormOptionValue = (
    type: Exclude<FormOptionType, "optional">,
    value: string
  ) => {
    if (type === "title_clean") {
      atualizarCampo("title_clean", value);
      return;
    }
    if (type === "fuel") {
      atualizarCampo("fuel", value);
      return;
    }
    if (type === "gear") {
      atualizarCampo("gear", value);
      return;
    }
    if (type === "motor") {
      atualizarCampo("motor", value);
      return;
    }
    if (type === "color") {
      atualizarCampo("color", value);
      return;
    }
    atualizarCampo("version", value);
  };

  const criarOpcaoFormulario = async (type: FormOptionType) => {
    if (!canEditInventory) return;

    const rawValue = novoAtributo[type]?.trim();
    const value = normalizarValorFormOption(type, rawValue);

    if (!value) {
      showError("Digite o nome da opção.");
      return;
    }

    const exists = formOptions.some(
      (item) =>
        item.option_type === type &&
        normalizeText(item.value || "") === normalizeText(value)
    );

    try {
      setFormOptionsSaving(true);

      if (!exists) {
        const now = new Date().toISOString();

        const { error } = await (supabase as any)
          .from("vehicles_joinha_form_options")
          .insert({
            option_type: type,
            value,
            active: true,
            created_at: now,
            updated_at: now,
          });

        if (error) throw error;
      }

      setNovoAtributo((prev) => ({
        ...prev,
        [type]: "",
      }));

      if (type === "optional") {
        syncSelectedOptionals([...selectedOptionals, value]);
      } else {
        setCurrentFormOptionValue(type, value);
      }

      await carregarFormOptions();
      showSuccess(exists ? "Opção aplicada." : "Opção criada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao criar opção do formulário:", error);
      showError(error?.message || "Não foi possível criar a opção.");
    } finally {
      setFormOptionsSaving(false);
    }
  };

  const deletarOpcaoFormulario = async (
    type: FormOptionType,
    explicitValue?: string
  ) => {
    if (!canEditInventory) return;

    const value =
      explicitValue?.trim() ||
      (type === "optional" ? "" : getCurrentFormOptionValue(type).trim());

    if (!value) {
      return showError("Selecione uma opção para excluir.");
    }

    const idsParaDeletar = formOptions
      .filter(
        (item) =>
          item.option_type === type &&
          normalizeText(item.value || "") === normalizeText(value)
      )
      .map((item) => item.id);

    if (idsParaDeletar.length === 0) {
      return showError("Opção não encontrada no catálogo.");
    }

    const confirmar = window.confirm(
      "Deseja excluir essa opção do catálogo? Isso não vai mexer nos veículos já cadastrados."
    );

    if (!confirmar) return;

    try {
      setFormOptionsSaving(true);

      const now = new Date().toISOString();

      const { error } = await (supabase as any)
        .from("vehicles_joinha_form_options")
        .update({
          active: false,
          updated_at: now,
        })
        .in("id", idsParaDeletar);

      if (error) throw error;

      if (type === "optional") {
        syncSelectedOptionals(
          selectedOptionals.filter(
            (item) => normalizeText(item) !== normalizeText(value)
          )
        );
      } else if (
        normalizeText(getCurrentFormOptionValue(type)) === normalizeText(value)
      ) {
        setCurrentFormOptionValue(type, "");
      }

      await carregarFormOptions();
      showSuccess("Opção removida do catálogo sem alterar veículos cadastrados.");
    } catch (error: any) {
      console.error("Erro ao excluir opção do formulário:", error);
      showError(error?.message || "Não foi possível excluir a opção.");
    } finally {
      setFormOptionsSaving(false);
    }
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

    if (exists) return showError("Esse item já existe no catálogo.");

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
      "Deseja excluir esse item do catálogo? Isso vai remover apenas a opção do catálogo e não vai mexer nos veículos já cadastrados."
    );

    if (!confirmar) return;

    const idsParaDeletar = catalogItems
      .filter((item) => {
        const sameCategory =
          normalizeText(item.category || "") === normalizeText(category);

        if (type === "category") return sameCategory;

        const sameMake = normalizeText(item.make || "") === normalizeText(make);
        if (type === "make") return sameCategory && sameMake;

        const sameModel =
          normalizeText(item.model || "") === normalizeText(model);
        if (type === "model") return sameCategory && sameMake && sameModel;

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

      await carregarCatalogo();
      showSuccess("Item removido do catálogo sem alterar veículos cadastrados.");
    } catch (error: any) {
      console.error("Erro ao excluir item do catálogo:", error);
      showError(error?.message || "Não foi possível excluir o item.");
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleSelectImages = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canEditInventory) return;

    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    event.target.value = "";

    if (files.length === 0) return;

    const remainingSlots = 10 - vehicleImages.length;

    if (remainingSlots <= 0) {
      showError("Limite de 10 fotos por veículo atingido.");
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      showError("Você pode enviar no máximo 10 fotos por veículo.");
    }

    try {
      setUploadingImages(true);

      const uploadedItems: VehicleImageItem[] = [];

      for (let index = 0; index < filesToUpload.length; index += 1) {
        const file = filesToUpload[index];
        const ext =
          file.name.split(".").pop()?.toLowerCase() ||
          file.type.split("/").pop()?.toLowerCase() ||
          "jpg";

        const safeExternalId = (form.external_id || "sem-id")
          .trim()
          .replace(/[^a-zA-Z0-9-_]/g, "-");

        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "-")
          .toLowerCase();

        const filePath = `${safeExternalId}/${Date.now()}-${index}-${safeName}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("Vehicles-Joinha")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("Vehicles-Joinha").getPublicUrl(filePath);

        uploadedItems.push({
          url: publicUrl,
          path: filePath,
        });
      }

      syncImagesToForm([...vehicleImages, ...uploadedItems]);
      showSuccess("Fotos adicionadas com sucesso.");
    } catch (error: any) {
      console.error("Erro ao enviar imagens:", error);
      showError(error?.message || "Não foi possível enviar as imagens.");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSetMainImage = (index: number) => {
    if (index <= 0) return;

    const updated = [...vehicleImages];
    const [selected] = updated.splice(index, 1);
    updated.unshift(selected);

    syncImagesToForm(updated);
  };

  const handlePreviewImage = (index: number) => {
    setPreviewImageIndex(index);
  };

  const handleRemoveImage = async (index: number) => {
    const image = vehicleImages[index];
    if (!image) return;

    try {
      if (image.path) {
        const { error } = await supabase.storage
          .from("Vehicles-Joinha")
          .remove([image.path]);

        if (error) throw error;
      }

      const updated = vehicleImages.filter((_, i) => i !== index);
      syncImagesToForm(updated);
      showSuccess("Foto removida.");
    } catch (error: any) {
      console.error("Erro ao remover imagem:", error);
      showError(error?.message || "Não foi possível remover a foto.");
    }
  };

  const excluirVeiculo = async (vehicle: Vehicle) => {
    if (!canEditInventory) return;

    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este cadastro? Isso vai apagar o veículo da tabela e remover as fotos do bucket."
    );

    if (!confirmar) return;

    try {
      setDeletingId(vehicle.id);

      const imagePaths = (vehicle.images_large || [])
        .map((url) => extractStoragePathFromUrl(url))
        .filter(Boolean) as string[];

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("Vehicles-Joinha")
          .remove(imagePaths);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from("vehicles_joinha")
        .delete()
        .eq("id", vehicle.id);

      if (dbError) throw dbError;

      await carregarVehicles();
      showSuccess("Cadastro excluído com sucesso.");
    } catch (error: any) {
      console.error("Erro ao excluir veículo:", error);
      showError(error?.message || "Não foi possível excluir o cadastro.");
    } finally {
      setDeletingId(null);
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
    const version = form.version.trim() || null;
    const options_clean = buildOptionsText(selectedOptionals);

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
        options_clean: options_clean || null,
        version,
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
          version || "",
          options_clean,
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
      syncSelectedOptionals([]);
      resetImageState();
      resetNovoAtributo();
      await Promise.all([
        carregarVehicles(),
        carregarCatalogo(),
        carregarFormOptions(),
      ]);
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
    "w-full h-10 rounded-md border border-[#1c3b4f] bg-[#0b1d2a] px-3 text-white outline-none focus:border-[#2aa7b8]";

  const selectedPreviewImage =
    vehicleImages[previewImageIndex] || vehicleImages[0] || null;

  const formGalleryImages = useMemo<GalleryImage[]>(
    () =>
      vehicleImages.map((img, index) => ({
        url: img.url,
        alt: `Foto do veículo ${index + 1}`,
      })),
    [vehicleImages]
  );

  const galleryCurrentImage = galleryModal?.images[galleryModal.index] || null;
  const galleryHasManyImages = (galleryModal?.images.length || 0) > 1;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Estoque
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Gestão do estoque da Joinha. Ative, desative, cadastre ou altere
              veículos conforme necessário.
            </p>
          </div>

          {!galleryModal && (
            <div className="flex flex-wrap items-center gap-3">
              {canEditInventory && (
                <Button
                  onClick={abrirCadastro}
                  className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                >
                  <Plus size={16} className="mr-2" />
                  Cadastrar veículo
                </Button>
              )}

              <Button
                onClick={() => {
                  carregarVehicles();
                  carregarCatalogo();
                  carregarFormOptions();
                }}
                variant="outline"
                className="border-[#27455a] bg-transparent text-white hover:bg-[#0b1d2a] hover:text-white"
                disabled={loading}
              >
                <RefreshCcw size={16} className="mr-2" />
                Recarregar lista
              </Button>

              <Button
                onClick={() => navigate("/dashboard")}
                className="border border-[#27455a] bg-[#0b1d2a] text-white hover:bg-[#12364a] hover:text-white"
              >
                <ArrowLeft size={16} className="mr-2" />
                Voltar
              </Button>
            </div>
          )}
        </div>

        {cadastroAberto && canEditInventory && (
          <div ref={formRef} className="scroll-mt-24">
            <Card className="bg-[#0a1722] border-[#2aa7b8]/40 rounded-2xl">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white">{formTitle}</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      {editingVehicle
                        ? "Atualize os dados do veículo e ajuste o status no estoque."
                        : "Cadastre um novo veículo e escolha se ele estará ativo ou inativo no estoque."}
                    </p>
                  </div>

                  <Button
                    onClick={fecharCadastro}
                    variant="outline"
                    className="border-[#27455a] bg-transparent text-white hover:bg-[#0b1d2a] hover:text-white"
                    disabled={saving || catalogSaving || formOptionsSaving}
                  >
                    <X size={16} className="mr-2" />
                    Fechar
                  </Button>
                </div>

                <form onSubmit={salvarVeiculo} className="space-y-5">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                          disabled={saving || catalogSaving || formOptionsSaving}
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
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.category
                          }
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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarItemCatalogo("category")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar categoria"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.category
                          }
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
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.make
                          }
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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.category
                          }
                        />

                        <Button
                          type="button"
                          onClick={() => criarItemCatalogo("make")}
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.category
                          }
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar marca"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.category ||
                            !form.make
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
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.model
                          }
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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.category ||
                            !form.make
                          }
                        />

                        <Button
                          type="button"
                          onClick={() => criarItemCatalogo("model")}
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.category ||
                            !form.make
                          }
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar modelo"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                            formOptionsSaving ||
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
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.base_model
                          }
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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
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
                            formOptionsSaving ||
                            !form.category ||
                            !form.make ||
                            !form.model
                          }
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar modelo base"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Título limpo
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={form.title_clean}
                          onChange={(e) =>
                            atualizarCampo("title_clean", e.target.value)
                          }
                          className={selectClass}
                          disabled={saving || catalogSaving || formOptionsSaving}
                        >
                          <option value="">Selecione</option>
                          {withCurrent(form.title_clean, titleCleanOptions).map(
                            (item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            )
                          )}
                        </select>

                        <Button
                          type="button"
                          onClick={() => deletarOpcaoFormulario("title_clean")}
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.title_clean
                          }
                          variant="outline"
                          className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                          title="Excluir título limpo do catálogo"
                        >
                          <X size={16} />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={novoAtributo.title_clean}
                          onChange={(e) =>
                            setNovoAtributo((prev) => ({
                              ...prev,
                              title_clean: e.target.value,
                            }))
                          }
                          placeholder="Novo título limpo"
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarOpcaoFormulario("title_clean")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar título limpo"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Ano referência
                      </label>
                      <Input
                        value={form.year}
                        onChange={(e) =>
                          atualizarCampo("year", e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="2016"
                        inputMode="numeric"
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Quilometragem
                      </label>
                      <Input
                        value={form.mileage}
                        onChange={(e) =>
                          atualizarCampo("mileage", e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="82000"
                        inputMode="numeric"
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Combustível
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={form.fuel}
                          onChange={(e) => atualizarCampo("fuel", e.target.value)}
                          className={selectClass}
                          disabled={saving || catalogSaving || formOptionsSaving}
                        >
                          <option value="">Selecione</option>
                          {withCurrent(form.fuel, fuels).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          onClick={() => deletarOpcaoFormulario("fuel")}
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.fuel
                          }
                          variant="outline"
                          className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                          title="Excluir combustível do catálogo"
                        >
                          <X size={16} />
                        </Button>
                      </div>

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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarOpcaoFormulario("fuel")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar combustível"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Câmbio
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={form.gear}
                          onChange={(e) => atualizarCampo("gear", e.target.value)}
                          className={selectClass}
                          disabled={saving || catalogSaving || formOptionsSaving}
                        >
                          <option value="">Selecione</option>
                          {withCurrent(form.gear, gears).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          onClick={() => deletarOpcaoFormulario("gear")}
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.gear
                          }
                          variant="outline"
                          className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                          title="Excluir câmbio do catálogo"
                        >
                          <X size={16} />
                        </Button>
                      </div>

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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarOpcaoFormulario("gear")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar câmbio"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Motor
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={form.motor}
                          onChange={(e) => atualizarCampo("motor", e.target.value)}
                          className={selectClass}
                          disabled={saving || catalogSaving || formOptionsSaving}
                        >
                          <option value="">Selecione</option>
                          {withCurrent(form.motor, motors).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          onClick={() => deletarOpcaoFormulario("motor")}
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.motor
                          }
                          variant="outline"
                          className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                          title="Excluir motor do catálogo"
                        >
                          <X size={16} />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={novoAtributo.motor}
                          onChange={(e) =>
                            setNovoAtributo((prev) => ({
                              ...prev,
                              motor: e.target.value,
                            }))
                          }
                          placeholder="Novo motor"
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarOpcaoFormulario("motor")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar motor"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Portas
                      </label>
                      <Input
                        value={form.doors}
                        onChange={(e) =>
                          atualizarCampo("doors", e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="4"
                        inputMode="numeric"
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Cor
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={form.color}
                          onChange={(e) => atualizarCampo("color", e.target.value)}
                          className={selectClass}
                          disabled={saving || catalogSaving || formOptionsSaving}
                        >
                          <option value="">Selecione</option>
                          {withCurrent(form.color, colors).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          onClick={() => deletarOpcaoFormulario("color")}
                          disabled={
                            saving || catalogSaving || formOptionsSaving || !form.color
                          }
                          variant="outline"
                          className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                          title="Excluir cor do catálogo"
                        >
                          <X size={16} />
                        </Button>
                      </div>

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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarOpcaoFormulario("color")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar cor"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Placa
                      </label>
                      <Input
                        value={form.plate}
                        onChange={(e) =>
                          atualizarCampo("plate", e.target.value.toUpperCase())
                        }
                        placeholder="FJR1A61"
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Final da placa
                      </label>
                      <Input
                        value={form.plate_final}
                        onChange={(e) =>
                          atualizarCampo("plate_final", e.target.value)
                        }
                        placeholder="1"
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Versão
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={form.version}
                          onChange={(e) => atualizarCampo("version", e.target.value)}
                          className={selectClass}
                          disabled={saving || catalogSaving || formOptionsSaving}
                        >
                          <option value="">Selecione</option>
                          {withCurrent(form.version, versions).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          onClick={() => deletarOpcaoFormulario("version")}
                          disabled={
                            saving ||
                            catalogSaving ||
                            formOptionsSaving ||
                            !form.version
                          }
                          variant="outline"
                          className="border-red-900/60 bg-transparent text-red-400 hover:bg-red-950/30"
                          title="Excluir versão do catálogo"
                        >
                          <X size={16} />
                        </Button>
                      </div>

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
                          className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                          disabled={saving || catalogSaving || formOptionsSaving}
                        />

                        <Button
                          type="button"
                          onClick={() => criarOpcaoFormulario("version")}
                          disabled={saving || catalogSaving || formOptionsSaving}
                          className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          title="Criar versão"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 xl:col-span-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Imagens
                      </label>

                      <div className="rounded-2xl border border-[#1c3b4f] bg-[#07131f] p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Fotos do veículo
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Máximo de 10 fotos. Clique para visualizar, use a
                              estrela para definir a principal do card.
                            </p>
                          </div>

                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleSelectImages}
                          />

                          <Button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={
                              saving ||
                              catalogSaving ||
                              formOptionsSaving ||
                              uploadingImages ||
                              vehicleImages.length >= 10
                            }
                            className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                          >
                            <Upload size={16} className="mr-2" />
                            {uploadingImages ? "Enviando..." : "Selecionar fotos"}
                          </Button>
                        </div>

                        {vehicleImages.length > 0 ? (
                          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                                Foto principal do card
                              </p>

                              <div className="relative overflow-hidden rounded-2xl border border-[#1c3b4f] bg-[#081521]">
                                <button
                                  type="button"
                                  onClick={() => openGallery(formGalleryImages, 0)}
                                  className="block w-full"
                                  title="Abrir galeria"
                                >
                                  <img
                                    src={vehicleImages[0].url}
                                    alt="Foto principal do veículo"
                                    className="w-full h-[260px] object-cover object-center cursor-zoom-in"
                                  />
                                </button>

                                <div className="absolute top-3 left-3 rounded-full bg-[#0f2c3d]/80 px-3 py-1 text-xs font-bold text-white border border-[#27566f]">
                                  Principal
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                                Miniaturas
                              </p>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {vehicleImages.map((img, index) => {
                                  const isMain = index === 0;
                                  const isPreview = index === previewImageIndex;

                                  return (
                                    <div
                                      key={`${img.url}-${index}`}
                                      className={cn(
                                        "relative overflow-hidden rounded-xl border bg-[#081521]",
                                        isMain
                                          ? "border-[#2aa7b8]"
                                          : isPreview
                                          ? "border-sky-500"
                                          : "border-[#1c3b4f]"
                                      )}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handlePreviewImage(index);
                                          openGallery(formGalleryImages, index);
                                        }}
                                        className="block w-full"
                                        title="Abrir galeria"
                                      >
                                        <img
                                          src={img.url}
                                          alt={`Miniatura ${index + 1}`}
                                          className="w-full h-[92px] object-cover object-center cursor-zoom-in"
                                        />
                                      </button>

                                      <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                                        {isMain ? (
                                          <span className="rounded-full bg-[#2aa7b8] px-2 py-1 text-[10px] font-black text-white">
                                            PRINCIPAL
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleSetMainImage(index)}
                                            className="rounded-full bg-[#0f2c3d]/80 p-1.5 text-white border border-[#27566f] hover:bg-[#12364a]"
                                            title="Definir como principal do card"
                                          >
                                            <Star size={12} />
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveImage(index)}
                                          className="rounded-full bg-[#0f2c3d]/80 p-1.5 text-red-300 border border-[#27566f] hover:bg-[#12364a]"
                                          title="Remover foto"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {selectedPreviewImage && (
                                <div className="space-y-2 pt-2">
                                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                                    Visualização selecionada
                                  </p>
                                  <div className="relative overflow-hidden rounded-2xl border border-[#1c3b4f] bg-[#081521]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openGallery(
                                          formGalleryImages,
                                          previewImageIndex
                                        )
                                      }
                                      className="block w-full"
                                      title="Abrir galeria"
                                    >
                                      <img
                                        src={selectedPreviewImage.url}
                                        alt="Visualização selecionada"
                                        className="w-full h-[220px] object-cover object-center cursor-zoom-in"
                                      />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[#27455a] bg-[#07131f] p-6 text-center">
                            <p className="text-sm text-slate-400">
                              Nenhuma foto adicionada ainda.
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Clique em “Selecionar fotos” para enviar até 10
                              imagens.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 xl:col-span-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Opções / opcionais
                      </label>

                      <div className="rounded-2xl border border-[#1c3b4f] bg-[#07131f] p-4 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Checklist de opcionais
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Marque os opcionais do veículo, crie novos quando
                            precisar e apague do catálogo sem mexer nos veículos já salvos.
                          </p>
                        </div>

                        {optionalChoices.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {optionalChoices.map((item) => {
                              const checked = selectedOptionals.some(
                                (selected) =>
                                  normalizeText(selected) === normalizeText(item)
                              );

                              return (
                                <div
                                  key={item}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-[#1c3b4f] bg-[#081521] px-3 py-2"
                                >
                                  <label className="flex items-center gap-3 text-sm text-white cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleOptional(item)}
                                      className="h-4 w-4 accent-[#2aa7b8]"
                                      disabled={
                                        saving || catalogSaving || formOptionsSaving
                                      }
                                    />
                                    <span>{item}</span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deletarOpcaoFormulario("optional", item)
                                    }
                                    disabled={
                                      saving || catalogSaving || formOptionsSaving
                                    }
                                    className="rounded-full border border-red-900/60 bg-transparent p-1 text-red-400 hover:bg-red-950/30"
                                    title="Excluir opcional do catálogo"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#27455a] bg-[#081521] p-4 text-sm text-slate-400">
                            Nenhum opcional cadastrado ainda.
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Input
                            value={novoAtributo.optional}
                            onChange={(e) =>
                              setNovoAtributo((prev) => ({
                                ...prev,
                                optional: e.target.value,
                              }))
                            }
                            placeholder="Novo opcional"
                            className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                            disabled={saving || catalogSaving || formOptionsSaving}
                          />

                          <Button
                            type="button"
                            onClick={() => criarOpcaoFormulario("optional")}
                            disabled={saving || catalogSaving || formOptionsSaving}
                            className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                            title="Criar opcional"
                          >
                            <Plus size={16} />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                            Selecionados
                          </p>

                          {selectedOptionals.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedOptionals.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full border border-[#1c3b4f] bg-[#081521] px-3 py-1 text-xs text-white"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">
                              Nenhum opcional selecionado.
                            </p>
                          )}

                          <Textarea
                            value={form.options_clean}
                            readOnly
                            className="bg-[#0b1d2a] border-[#1c3b4f] text-white min-h-[90px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Descrição
                      </label>
                      <Textarea
                        value={form.description_clean}
                        onChange={(e) =>
                          atualizarCampo("description_clean", e.target.value)
                        }
                        placeholder="Descrição completa do veículo..."
                        className="bg-[#0b1d2a] border-[#1c3b4f] text-white min-h-[120px]"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                      <p className="text-xs text-slate-500">
                        Ativo = aparece para a IA. Inativo = fica salvo, mas não
                        entra na busca do agente.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      disabled={saving || catalogSaving || formOptionsSaving}
                      className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                    >
                      {saving ? "Salvando alterações..." : "Salvar alterações"}
                    </Button>

                    {(catalogSaving || formOptionsSaving) && (
                      <span className="text-sm text-slate-400 self-center">
                        Atualizando catálogos...
                      </span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#081521] border-[#1c3b4f] rounded-2xl">
            <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-slate-400 text-sm font-black uppercase tracking-widest">
                  Total
                </span>
                <Car size={18} className="text-[#2aa7b8]" />
              </div>
              <div className="text-4xl font-black text-white">{totalVeiculos}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#081521] border-[#1c3b4f] rounded-2xl">
            <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-slate-400 text-sm font-black uppercase tracking-widest">
                  Ativos
                </span>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div className="text-4xl font-black text-emerald-400">
                {veiculosAtivos}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#081521] border-[#1c3b4f] rounded-2xl">
            <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-slate-400 text-sm font-black uppercase tracking-widest">
                  Inativos
                </span>
                <CircleX size={18} className="text-slate-300" />
              </div>
              <div className="text-4xl font-black text-slate-300">
                {veiculosInativos}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#0a1722] border-[#1c3b4f] rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  Placa
                </label>
                <Input
                  value={placaBusca}
                  onChange={(e) => setPlacaBusca(e.target.value.toUpperCase())}
                  placeholder="Ex.: FJR1A61"
                  className="bg-[#0b1d2a] border-[#1c3b4f] text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
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
                className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
              >
                <Search size={16} className="mr-2" />
                Buscar
              </Button>

              <Button
                onClick={limparFiltros}
                variant="outline"
                className="border-[#27455a] bg-transparent text-white hover:bg-[#0b1d2a] hover:text-white"
              >
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="bg-[#0a1722] border-[#1c3b4f] rounded-2xl">
            <CardContent className="p-6 text-slate-400">
              Carregando estoque...
            </CardContent>
          </Card>
        ) : filteredVehicles.length === 0 ? (
          <Card className="bg-[#0a1722] border-[#1c3b4f] rounded-2xl">
            <CardContent className="p-6 text-slate-400">
              Nenhum veículo encontrado com os filtros atuais.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => {
              const isActive = vehicle.available !== false;
              const isToggling = togglingId === vehicle.id;
              const images = getVehicleImages(vehicle);

              const vehicleGalleryImages: GalleryImage[] = images.map(
                (img, index) => ({
                  url: img,
                  alt: `${vehicle.make || ""} ${vehicle.model || ""} - foto ${
                    index + 1
                  }`,
                })
              );

              return (
                <Card
                  key={vehicle.id}
                  className="bg-[#0a1722] border-[#1c3b4f] rounded-2xl"
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-5">
                      <div className="w-full lg:w-[380px] shrink-0">
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={() => openGallery(vehicleGalleryImages, 0)}
                            className="block w-full group"
                            title="Abrir galeria"
                          >
                            <img
                              src={images[0]}
                              alt={`${vehicle.make || ""} ${
                                vehicle.model || ""
                              } - foto principal`}
                              className="w-full h-[300px] md:h-[340px] object-cover object-center rounded-2xl border border-[#1c3b4f] bg-[#081521] transition-all duration-300 group-hover:border-[#2aa7b8]/70 group-hover:scale-[1.01] cursor-zoom-in"
                            />
                          </button>

                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {images.slice(1).map((img, index) => {
                              const realIndex = index + 1;
                              const alt = `${vehicle.make || ""} ${
                                vehicle.model || ""
                              } - foto ${realIndex + 1}`;

                              return (
                                <button
                                  key={`${vehicle.id}-${index}`}
                                  type="button"
                                  onClick={() =>
                                    openGallery(vehicleGalleryImages, realIndex)
                                  }
                                  className="block w-full"
                                  title="Abrir galeria"
                                >
                                  <img
                                    src={img}
                                    alt={alt}
                                    className="w-full h-[68px] object-cover rounded-xl border border-[#1c3b4f] bg-[#081521] transition-all duration-300 hover:scale-[1.03] hover:border-[#2aa7b8]/60 hover:shadow-[0_0_0_1px_rgba(42,167,184,0.18)] cursor-zoom-in"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
                                    : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                                )}
                              >
                                {isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>

                            <p className="text-slate-400 text-sm mt-1">
                              {vehicle.title_clean || "Sem título"}
                            </p>
                          </div>

                          {canEditInventory && (
                            <div className="flex flex-wrap gap-3">
                              <Button
                                onClick={() => abrirEdicao(vehicle)}
                                variant="outline"
                                className="border-[#27455a] bg-transparent text-white hover:bg-[#0b1d2a] hover:text-white"
                              >
                                <PencilLine size={16} className="mr-2" />
                                Alterar
                              </Button>

                              {isActive ? (
                                <Button
                                  onClick={() => alterarStatus(vehicle, false)}
                                  disabled={isToggling}
                                  className="bg-[#12364a] hover:bg-[#17485f] text-white font-black"
                                >
                                  {isToggling ? "Processando..." : "Desativar"}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => alterarStatus(vehicle, true)}
                                  disabled={isToggling}
                                  className="bg-[#2aa7b8] hover:bg-[#2396a6] text-white font-black"
                                >
                                  {isToggling ? "Processando..." : "Ativar"}
                                </Button>
                              )}

                              <Button
                                onClick={() => excluirVeiculo(vehicle)}
                                disabled={deletingId === vehicle.id}
                                className="bg-red-600 hover:bg-red-700 text-white font-black"
                              >
                                {deletingId === vehicle.id
                                  ? "Excluindo..."
                                  : "Excluir cadastro"}
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Placa
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.plate || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Ano
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.year || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Preço
                            </p>
                            <p className="text-white font-semibold">
                              {formatMoney(vehicle.promo_price || vehicle.price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Cor
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.color || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Combustível
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.fuel || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Câmbio
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.gear || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Motor
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.motor || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400 uppercase text-xs font-bold">
                              Portas
                            </p>
                            <p className="text-white font-semibold">
                              {vehicle.doors ?? "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {vehicle.base_model && (
                            <span className="rounded-full border border-[#1c3b4f] px-3 py-1">
                              Base: {vehicle.base_model}
                            </span>
                          )}
                          {vehicle.version && (
                            <span className="rounded-full border border-[#1c3b4f] px-3 py-1">
                              Versão: {vehicle.version}
                            </span>
                          )}
                          {vehicle.category && (
                            <span className="rounded-full border border-[#1c3b4f] px-3 py-1">
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

      {isClient &&
        galleryModal &&
        galleryCurrentImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/95"
            onClick={closeGallery}
          >
            <div
              className="flex min-h-screen w-full items-center justify-center px-2 py-3 sm:px-4 sm:py-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="w-full max-w-6xl">
                <div className="rounded-2xl bg-transparent">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                    <button
                      type="button"
                      onClick={closeGallery}
                      className="absolute right-3 top-3 z-30 rounded-full border border-white/20 bg-black/55 p-2 text-white backdrop-blur hover:bg-black/75"
                      title="Fechar"
                    >
                      <X size={22} />
                    </button>

                    {galleryHasManyImages && (
                      <>
                        <button
                          type="button"
                          onClick={goToPrevImage}
                          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65 sm:left-4"
                          title="Imagem anterior"
                        >
                          <ChevronLeft size={22} />
                        </button>

                        <button
                          type="button"
                          onClick={goToNextImage}
                          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65 sm:right-4"
                          title="Próxima imagem"
                        >
                          <ChevronRight size={22} />
                        </button>
                      </>
                    )}

                    <div className="flex items-center justify-center bg-black">
                      <img
                        src={galleryCurrentImage.url}
                        alt={galleryCurrentImage.alt}
                        className="w-full max-h-[72vh] sm:max-h-[78vh] object-contain bg-black"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <p className="truncate text-sm text-white/90">
                      {galleryCurrentImage.alt}
                    </p>

                    <span className="shrink-0 text-xs text-white/70">
                      {galleryModal.index + 1} / {galleryModal.images.length}
                    </span>
                  </div>

                  {galleryHasManyImages && (
                    <div className="mt-3 overflow-x-auto pb-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
                      <div className="flex w-max min-w-full gap-2">
                        {galleryModal.images.map((img, index) => {
                          const isActive = index === galleryModal.index;

                          return (
                            <button
                              key={`${img.url}-${index}`}
                              type="button"
                              onPointerUp={() => goToImage(index)}
                              style={{ touchAction: "manipulation" }}
                              className={cn(
                                "shrink-0 overflow-hidden rounded-xl border bg-[#081521] transition-all",
                                isActive
                                  ? "border-[#2aa7b8] ring-2 ring-[#2aa7b8]/30"
                                  : "border-white/10 hover:border-white/30"
                              )}
                              title={`Abrir imagem ${index + 1}`}
                            >
                              <img
                                src={img.url}
                                alt={img.alt}
                                className="h-16 w-24 object-cover sm:h-20 sm:w-32"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Inventory;

