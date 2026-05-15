"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { ArrowLeft, Save, PackagePlus } from "lucide-react";
import { createProductAction } from "@/lib/actions/store-admin";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: false, data: null, error: null };

export function NewStoreProductForm({ categories }) {
	const router = useRouter();
	const [state, formAction, pending] = useActionState(
		createProductAction,
		initialState,
	);

	useEffect(() => {
		if (state?.ok && state?.data?.id) {
			router.push(`/admin/tienda/${state.data.id}`);
		}
	}, [router, state]);

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="mb-8">
					<Link href="/admin/tienda" className="inline-flex cursor-pointer">
						<Button variant="ghost" size="sm" className="gap-2">
							<ArrowLeft className="h-4 w-4" />
							Volver al inventario
						</Button>
					</Link>
				</div>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<PackagePlus className="h-5 w-5 text-primary" />
							<CardTitle>Nuevo producto</CardTitle>
						</div>
						<CardDescription>
							Completá los datos para crear un producto en la tienda.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form action={formAction} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Nombre *</Label>
								<Input id="name" name="name" required disabled={pending} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="slug">Slug *</Label>
								<Input id="slug" name="slug" required disabled={pending} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="summary">Resumen *</Label>
								<textarea
									id="summary"
									name="summary"
									rows={2}
									required
									disabled={pending}
									className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Descripción</Label>
								<textarea
									id="description"
									name="description"
									rows={4}
									disabled={pending}
									className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="price">Precio (S/.) *</Label>
									<Input
										id="price"
										name="price"
										required
										placeholder="120.00"
										disabled={pending}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="stockQuantity">Stock *</Label>
									<Input
										id="stockQuantity"
										name="stockQuantity"
										required
										type="number"
										min="0"
										defaultValue="0"
										disabled={pending}
									/>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="status">Estado *</Label>
									<select
										id="status"
										name="status"
										defaultValue="draft"
										disabled={pending}
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										<option value="draft">Borrador</option>
										<option value="active">Activo</option>
										<option value="archived">Archivado</option>
									</select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="categoryId">Categoría *</Label>
									<select
										id="categoryId"
										name="categoryId"
										required
										disabled={pending}
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										<option value="">Seleccionar categoría</option>
										{categories.map((category) => (
											<option key={category.id} value={category.id}>
												{category.name}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="sku">SKU</Label>
									<Input id="sku" name="sku" disabled={pending} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="imageUrl">URL de imagen</Label>
									<Input id="imageUrl" name="imageUrl" disabled={pending} />
								</div>
							</div>

							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									name="featured"
									value="on"
									disabled={pending}
								/>
								Destacado
							</label>

							{state?.error?.message ? (
								<div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{state.error.message}
								</div>
							) : null}

							<div className="flex gap-3 border-t pt-4">
								<Button type="submit" disabled={pending} className="gap-2">
									<Save className="h-4 w-4" />
									{pending ? "Guardando..." : "Crear producto"}
								</Button>
								<Link
									href="/admin/tienda"
									className="inline-flex cursor-pointer"
								>
									<Button type="button" variant="outline" disabled={pending}>
										Cancelar
									</Button>
								</Link>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
