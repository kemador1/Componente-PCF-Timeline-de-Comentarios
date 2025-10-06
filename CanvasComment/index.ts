import { initializeIcons } from "@fluentui/react/lib/Icons";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { CommentTimeline as CommentTimelineComponent } from "./CommentTimeline";

// Register icons - but ignore warnings if they have been already registered by Power Apps
initializeIcons(undefined, { disableWarnings: true });

export class EnhancedCommentTimeline implements ComponentFramework.StandardControl<IInputs, IOutputs> {
	notifyOutputChanged: () => void;
	container: HTMLDivElement;
	context: ComponentFramework.Context<IInputs>;
	resources: ComponentFramework.Resources;
	isTestHarness: boolean;
	newCommentText: string = "";
	newCommentTrigger: number = 0;

	// Estado para contrato simplificado
	effectiveCommentsJSON: string = ""; // JSON efectivo mostrado (optimista/normalizado)
	oldJsonBeforeOptimistic: string = ""; // JSON previo al merge optimista (para rollback)
	isBusyOut: boolean = false;
	lastErrorOut: string = "";
	operationIdOut: string = "";
	requestPayloadOut: string = ""; // JSON string del payload de solicitud

	private generateGuid(): string {
		// GUID simple basado en RFC4122 v4 (pseudo)
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}



	onNewComment = (comment: any): void => {
		// Compatibilidad de salidas previas
		this.newCommentText = comment.text || "";
		this.newCommentTrigger++;

		// Preparar estado optimista
		const siteUrl = (this.context.parameters as any).SiteUrl?.raw || "";
		const recordId = (this.context.parameters as any).RecordId?.raw || "";
		const incomingJson = (this.context.parameters.CommentsJSON?.raw || "").trim();
		this.oldJsonBeforeOptimistic = this.effectiveCommentsJSON || incomingJson || "[]";
		let baseArray: any[] = [];
		try {
			baseArray = this.oldJsonBeforeOptimistic && this.oldJsonBeforeOptimistic.trim().startsWith('[')
				? JSON.parse(this.oldJsonBeforeOptimistic)
				: [];
		} catch {
			baseArray = [];
		}

		// Unshift comentario optimista
		baseArray.unshift(comment);
		this.effectiveCommentsJSON = JSON.stringify(baseArray);

		// Generar OperationId y RequestPayload
		this.operationIdOut = this.generateGuid();
		this.requestPayloadOut = JSON.stringify({
			SiteUrl: siteUrl,
			RecordId: recordId,
			Text: this.newCommentText,
			OperationId: this.operationIdOut
		});
		this.isBusyOut = true;
		this.lastErrorOut = "";

		// Emitir cambios para que el host ejecute el Flow
		this.notifyOutputChanged();
	};

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(
		context: ComponentFramework.Context<IInputs>,
		notifyOutputChanged: () => void,
		state: ComponentFramework.Dictionary,
		container: HTMLDivElement
	): void {
		this.notifyOutputChanged = notifyOutputChanged;
		this.container = container;
		this.context = context;
		this.context.mode.trackContainerResize(true);
		this.resources = this.context.resources;
		this.isTestHarness = document.getElementById("control-dimensions") !== null;
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void {
		// The test harness provides width/height as strings
		const allocatedWidth = parseInt(context.mode.allocatedWidth as unknown as string);
		const allocatedHeight = parseInt(context.mode.allocatedHeight as unknown as string);

		// Get JSON inputs
		const commentsJSONIn = context.parameters.CommentsJSON?.raw || "";
		const flowReturnIn = (context.parameters as any).FlowReturnIn?.raw as string | undefined;

		// Si no estamos ocupados, sincronizar el JSON efectivo con la entrada
		if (!this.isBusyOut) {
			this.effectiveCommentsJSON = commentsJSONIn || "";
		}

		// Procesar retorno del Flow si aplica
		if (this.isBusyOut && flowReturnIn && flowReturnIn.trim()) {
			try {
				const parsed = JSON.parse(flowReturnIn);
				const opId = String(parsed.operationId || "");
				if (opId && this.operationIdOut && opId.toLowerCase() === this.operationIdOut.toLowerCase()) {
					const hasError = Boolean(parsed.error);
					const payloadText = typeof parsed.payload === 'string' ? parsed.payload : JSON.stringify(parsed.payload ?? "");
					if (hasError) {
						// Rollback
						this.effectiveCommentsJSON = this.oldJsonBeforeOptimistic || commentsJSONIn || "[]";
						this.lastErrorOut = "No se pudo publicar el comentario. Se ha deshecho en el timeline.";
						this.isBusyOut = false;
					} else {
						// Normalización
						const trimmed = (payloadText || "").trim();
						let nextJSON = this.effectiveCommentsJSON;
						if (trimmed.startsWith('[')) {
							// Array directo
							nextJSON = trimmed;
						} else if (trimmed.startsWith('{')) {
							try {
								const pobj = JSON.parse(trimmed);
								if (Array.isArray(pobj?.value)) {
									nextJSON = JSON.stringify(pobj.value);
								} else {
									// Objeto único: reemplazar la primera posición del array previo al optimista
									let baseArr: any[] = [];
									try {
										baseArr = this.oldJsonBeforeOptimistic && this.oldJsonBeforeOptimistic.trim().startsWith('[')
											? JSON.parse(this.oldJsonBeforeOptimistic)
											: [];
									} catch { baseArr = []; }
									baseArr.unshift(pobj);
									nextJSON = JSON.stringify(baseArr);
								}
							} catch {
								// Si el payload no es JSON válido, mantener el optimista
							}
						}
						this.effectiveCommentsJSON = nextJSON;
						this.lastErrorOut = "";
						this.isBusyOut = false;
					}
				}
			} catch (e) {
				// Ignorar parsing errors; el host debe proveer JSON válido
			}
		}

		render(
			React.createElement(CommentTimelineComponent, {
				width: allocatedWidth,
				height: allocatedHeight,
				commentsJSON: this.effectiveCommentsJSON || commentsJSONIn,
				resources: this.resources,
				isLoading: (this.context.parameters as any).IsLoading?.raw ?? false,
				busy: this.isBusyOut,
				errorText: this.lastErrorOut,

				onNewComment: this.onNewComment,
			}),
			this.container
		);
	}

	/**
	 * It is called by the framework prior to a control receiving new data.
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
	 */
	public getOutputs(): IOutputs {
		const outputs: any = {
			NewCommentText: this.newCommentText || "",
			NewCommentTrigger: this.newCommentTrigger,
			// Nuevos outputs
			OperationIdOut: this.operationIdOut || "",
			RequestPayloadOut: this.requestPayloadOut || "",
			CommentsJSONOut: this.effectiveCommentsJSON || "",
			IsBusyOut: this.isBusyOut,
			LastError: this.lastErrorOut || "",
		};
		return outputs as IOutputs;
	}

	/**
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
		unmountComponentAtNode(this.container);
	}
}