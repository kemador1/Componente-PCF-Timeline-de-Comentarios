import * as React from "react";
import { Stack } from "@fluentui/react/lib/Stack";
import { Text } from "@fluentui/react/lib/Text";
import { Icon } from "@fluentui/react/lib/Icon";
import { IconButton, PrimaryButton } from "@fluentui/react/lib/Button";
import { TextField } from "@fluentui/react/lib/TextField";


interface SharePointComment {
    id: string;
    text: string;
    author: {
        directoryObjectId?: string;
        email: string;
        expiration?: string;
        id: number;
        isActive: boolean;
        isExternal: boolean;
        jobTitle?: string;
        loginName: string;
        name: string;
        principalType: number;
        userId?: string;
        userPrincipalName?: string;
    };
    createdDate: string;
    modifiedDate?: string;
    isReply: boolean;
    parentId: string;
    itemId: number;
    listId: string;
}

// La interfaz CommentsData ya no es necesaria porque manejamos ambos formatos dinámicamente

interface TimelineProps {
    width?: number;
    height?: number;
    commentsJSON: string;
    resources: ComponentFramework.Resources;
    isLoading?: boolean;
    onNewComment?: (comment: SharePointComment) => void;
    // Estado externo del PCF
    busy?: boolean;
    errorText?: string;
}

// Componente para mostrar un comentario individual
const CommentItem: React.FC<{ comment: SharePointComment; isReply?: boolean }> = ({ comment, isReply = false }) => {
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#0078d4', '#106ebe', '#005a9e', '#004578', '#003366'];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Función para obtener la foto del usuario usando SharePoint
    const getUserPhotoUrl = (email: string) => {
        if (!email) return "";
        
        // URL de SharePoint para fotos de perfil
        // Usa el host raíz del tenant, no el site
        const SP_HOST = "https://4f41wd.sharepoint.com";
        
        // Tamaños: S=48px, M=72px, L=96px
        // Cambia a M o L si necesitas fotos más grandes
        return `${SP_HOST}/_layouts/15/userphoto.aspx?size=S&accountname=${encodeURIComponent(email)}`;
    };

    const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Hace unos minutos';
        if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`;
        
            return date.toLocaleDateString('es-ES', {
            day: 'numeric', 
                month: 'short',
            year: 'numeric' 
            });
};

    return (
        <Stack
            horizontal
            tokens={{ childrenGap: 12 }}
            className="comment-item"
            styles={{
                root: {
                    padding: isReply ? '12px 16px 12px 48px' : '16px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e1e5e9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    marginBottom: '8px'
                }
            }}
        >
            {/* Avatar mejorado con fallback robusto */}
            <div className="comment-avatar" style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                    src={getUserPhotoUrl(comment.author.email)}
                    alt={comment.author.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const initials = target.nextElementSibling as HTMLElement;
                        initials.style.display = 'flex';
                        initials.style.background = getAvatarColor(comment.author.name);
                        initials.style.color = 'white';
                        initials.style.width = '40px';
                        initials.style.height = '40px';
                        initials.style.borderRadius = '50%';
                        initials.style.alignItems = 'center';
                        initials.style.justifyContent = 'center';
                        initials.style.fontWeight = '600';
                    }}
                />
                <div className="comment-avatar-initials" style={{ display: 'none' }}>
                    {getInitials(comment.author.name)}
                </div>
            </div>

            {/* Contenido del comentario */}
            <Stack tokens={{ childrenGap: 8 }} style={{ flex: 1 }}>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                    <Text 
                        variant="medium" 
                        className="comment-author-selectable"
                        styles={{ 
                            root: { 
                                fontWeight: 600, 
                                color: '#323130',
                                fontSize: '14px'
                            } 
                        }}
                    >
                        {comment.author.name}
                    </Text>
                    <Text 
                        variant="small" 
                        className="comment-date-selectable"
                        styles={{ 
                            root: { 
                                color: '#605e5c',
                                fontSize: '12px'
                            } 
                        }}
                    >
                        {formatDate(comment.createdDate)}
                    </Text>
                </Stack>
                
                <Text 
                    variant="medium" 
                    className="comment-text-selectable"
                    styles={{ 
                        root: { 
                            color: '#323130',
                            lineHeight: '1.5',
                            wordBreak: 'break-word'
                        } 
                    }}
                >
                    {comment.text}
                </Text>
            </Stack>
        </Stack>
    );
};

// Componente principal del timeline
export const CommentTimeline = React.memo((props: TimelineProps) => {
    const {
        commentsJSON,
        width,
        height,
        resources,
        isLoading = false,
        onNewComment,
        busy = false,
        errorText = ""
    } = props;

    const [newCommentText, setNewCommentText] = React.useState('');

    // ========================================
    // LÓGICA DE LÍMITES DE CARACTERES
    // ========================================
    const MAX_CHARACTERS = 2000;                    // Límite máximo de caracteres por comentario
    const WARNING_THRESHOLD = 1800;                 // Umbral de advertencia (90% del límite)

    // Cálculo de estado de caracteres
    const charactersUsed = newCommentText.length;   // Caracteres actualmente escritos
    const charactersRemaining = MAX_CHARACTERS - charactersUsed;  // Caracteres disponibles
    const isOverLimit = charactersUsed > MAX_CHARACTERS;          // ¿Se excedió el límite?
    const isNearLimit = charactersUsed > WARNING_THRESHOLD;       // ¿Está cerca del límite?

    // (Sin hilos) No se requieren contadores de respuestas

    // Procesar comentarios desde JSON
    const processedComments = React.useMemo(() => {
        let commentData: SharePointComment[] = [];
        
        try {
            if (commentsJSON && commentsJSON.trim()) {
                const parsedData = JSON.parse(commentsJSON);
                
                // Parser inteligente que maneja ambos formatos:
                // 1. { "value": [...] } - Formato de Power Apps
                // 2. [...] - Array directo de SharePoint
                if (parsedData && typeof parsedData === 'object') {
                    if (Array.isArray(parsedData)) {
                        // Caso 2: Array directo [...]
                        commentData = parsedData;
                    } else if (parsedData.value && Array.isArray(parsedData.value)) {
                        // Caso 1: { "value": [...] }
                        commentData = parsedData.value;
                    } else {
                        // Formato desconocido, intentar como array
                        commentData = [];
                    }
                } else {
                    commentData = [];
                }
            }
        } catch (error) {
            console.error('Error parsing comments JSON:', error);
            commentData = [];
        }

        // Procesar y adaptar comentarios a la estructura esperada
        const processedComments = commentData.map((comment: any, index: number) => {
            // Adaptar estructura simple a estructura completa
            return {
                id: comment.id || `comment-${index}`,
                text: comment.text || '',
                author: {
                    directoryObjectId: comment.author?.directoryObjectId || undefined,
                    email: comment.author?.email || comment.authorEmail || 'usuario@ejemplo.com',
                    expiration: comment.author?.expiration || undefined,
                    id: comment.author?.id || Math.floor(Math.random() * 1000),
                    isActive: comment.author?.isActive ?? true,
                    isExternal: comment.author?.isExternal ?? false,
                    jobTitle: comment.author?.jobTitle || undefined,
                    loginName: comment.author?.loginName || `i:0#.f|membership|${comment.author?.email || comment.authorEmail || 'usuario@ejemplo.com'}`,
                    name: comment.author?.name || comment.authorName || 'Usuario',
                    principalType: comment.author?.principalType || 1,
                    userId: comment.author?.userId || undefined,
                    userPrincipalName: comment.author?.userPrincipalName || undefined
                },
                createdDate: comment.createdDate || new Date().toISOString(),
                modifiedDate: comment.modifiedDate || undefined,
                isReply: comment.isReply || false,
                parentId: comment.parentId || "0",
                itemId: comment.itemId || 1,
                listId: comment.listId || "default-list"
            } as SharePointComment;
        });

        // Separar comentarios principales y respuestas
        const mainComments = processedComments.filter(c => !c.isReply || c.parentId === '0');
        const replies = processedComments.filter(c => c.isReply && c.parentId !== '0');

        // Ordenar por fecha (más reciente primero)
        mainComments.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        
        return { mainComments, replies, totalCount: processedComments.length };
    }, [commentsJSON]);

    // ========================================
    // MANEJO DE NUEVOS COMENTARIOS
    // ========================================
    const handleAddComment = React.useCallback(() => {
        // Validar que hay texto, callback disponible y no se excede el límite
        if (newCommentText.trim() && onNewComment && !isOverLimit) {
            const newComment: SharePointComment = {
                id: Date.now().toString(),
                text: newCommentText.trim(),
                author: {
                    directoryObjectId: undefined,
                    email: "usuario@ejemplo.com",
                    expiration: undefined,
                    id: Math.floor(Math.random() * 1000),
                    isActive: true,
                    isExternal: false,
                    jobTitle: undefined,
                    loginName: `i:0#.f|membership|usuario@ejemplo.com`,
                    name: "Usuario Actual",
                    principalType: 1,
                    userId: undefined,
                    userPrincipalName: undefined
                },
                createdDate: new Date().toISOString(),
                modifiedDate: undefined,
                isReply: false,
                parentId: "0",
                itemId: 1,
                listId: "new-comment-list"
            };
            
            onNewComment(newComment);
            setNewCommentText('');
        }
    }, [newCommentText, onNewComment, isOverLimit]);

    // (Sin hilos) Eliminado manejo de respuestas

    // ========================================
    // MANEJO DE SHORTCUTS DE TECLADO
    // ========================================
    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Solo Enter para enviar comentario (sin Shift+Enter)
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddComment();
        }
    }, [handleAddComment]);

    // (Sin hilos) No se requiere manejador para respuestas

    const rootContainerStyle: React.CSSProperties = React.useMemo(() => {
        return {
            height: height,
            width: width,
            backgroundColor: 'transparent',
            transition: 'all 0.5s ease-in-out',
            overflow: 'hidden',  // Evitar que el contenido se salga del PCF
            position: 'relative' // Para controlar elementos hijos
        };
    }, [width, height]);

    // Si está cargando, mostrar animaciones de carga
    if (isLoading) {
        return (
            <Stack verticalFill grow style={rootContainerStyle}>
                {/* Header con skeleton loader */}
                <Stack 
                    styles={{
                        root: {
                            padding: '20px 24px',
                            backgroundColor: 'transparent',
                            borderBottom: '1px solid #e1e5e9',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }
                    }}
                    tokens={{ childrenGap: 16 }}
                >
                    <Stack horizontal horizontalAlign="center" verticalAlign="center">
                        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                            {/* Skeleton para el icono */}
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: '#f0f0f0',
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }} />
                            
                            {/* Skeleton para el título */}
                            <Stack tokens={{ childrenGap: 4 }}>
                                <div style={{
                                    width: 200,
                                    height: 24,
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: 4,
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                                <div style={{
                                    width: 150,
                                    height: 16,
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: 4,
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                            </Stack>
                        </Stack>
                    </Stack>
                </Stack>

                {/* Contenido principal con skeleton loaders */}
                <Stack 
                    styles={{
                        root: {
                            padding: '24px',
                            flex: 1
                        }
                    }}
                    tokens={{ childrenGap: 20 }}
                >
                    {/* Skeleton para comentarios */}
                    {[1, 2, 3].map((index) => (
                        <Stack key={index} tokens={{ childrenGap: 12 }} className="skeleton-item">
                            <Stack horizontal tokens={{ childrenGap: 12 }}>
                                {/* Avatar skeleton */}
                                <div 
                                    className="skeleton-shimmer"
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%'
                                    }} 
                                />
                                
                                {/* Contenido del comentario skeleton */}
                                <Stack tokens={{ childrenGap: 8 }} style={{ flex: 1 }}>
                                    <div 
                                        className="skeleton-shimmer"
                                        style={{
                                            width: 120,
                                            height: 16,
                                            borderRadius: 4
                                        }} 
                                    />
                                    <div 
                                        className="skeleton-shimmer"
                                        style={{
                                            width: '100%',
                                            height: 60,
                                            borderRadius: 8
                                        }} 
                                    />
                                </Stack>
                            </Stack>
                        </Stack>
                    ))}
                </Stack>


            </Stack>
        );
    }

    return (
        <Stack verticalFill grow style={rootContainerStyle} className="comment-timeline-container">
            {/* Header sutil y moderno */}
            <Stack 
                className="header-animate"
                styles={{
                    root: {
                        padding: '20px 24px',
                        backgroundColor: 'transparent',
                        borderBottom: 'none',
                        boxShadow: 'none'
                    }
                }}
                tokens={{ childrenGap: 16 }}
            >
                <Stack horizontal horizontalAlign="center" verticalAlign="center">
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                        <Stack
                            horizontalAlign="center"
                            verticalAlign="center"
                            styles={{
                                root: {
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    backgroundColor: '#0078d4',
                                    boxShadow: '0 2px 8px rgba(0, 120, 212, 0.3)'
                                }
                            }}
                        >
                            <Icon iconName="Comment" styles={{ root: { fontSize: '18px', color: 'white' } }} />
                        </Stack>
                        
                        <Stack tokens={{ childrenGap: 4 }}>
                            <Text 
                                variant="xLarge" 
                                styles={{ 
                                    root: { 
                                        fontWeight: 600, 
                                        color: '#323130',
                                        fontSize: '20px'
                                    } 
                                }}
                            >
                                {resources.getString("CommentTimeline")}
                        </Text>
                            <Text 
                                variant="medium" 
                                styles={{ 
                                    root: { 
                                        color: '#605e5c',
                                        fontSize: '13px'
                                    } 
                                }}
                            >
                                {processedComments.mainComments.length} comentario{processedComments.mainComments.length !== 1 ? 's' : ''}
                        </Text>
                        </Stack>
                    </Stack>
                    </Stack>
                    
                {/* Formulario sutil para nuevo comentario */}
                <Stack 
                    className="form-animate text-field-with-shortcuts"
                    horizontal 
                    tokens={{ childrenGap: 12 }} 
                    verticalAlign="end"
                    styles={{
                        root: {
                            backgroundColor: '#fafbfc',
                            borderRadius: '12px',
                            padding: '16px',
                            border: '1px solid #e1e5e9',
                            maxHeight: '250px',  // Altura máxima expandida para 2000 caracteres
                            overflow: 'hidden'   // Evitar desbordamiento
                        }
                    }}
                >
                    <Stack tokens={{ childrenGap: 4 }} style={{ flex: 1, minHeight: '60px', maxHeight: '220px', overflow: 'hidden' }}>
                        <TextField
                            value={newCommentText}
                            onChange={(_, newValue) => setNewCommentText(newValue || '')}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un comentario... (Enter para enviar)"
                            multiline
                            autoAdjustHeight
                            rows={2}
                            maxLength={MAX_CHARACTERS}
                            ariaLabel="Campo para escribir nuevo comentario"
                            role="textbox"
                            styles={{
                                root: { flex: 1 },
                                field: {
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    fontSize: '14px',
                                    minHeight: '40px',   // Altura mínima
                                    maxHeight: '180px',  // Altura máxima para 2000 caracteres
                                    overflow: 'auto',    // Scroll si es necesario
                                    resize: 'none',      // Deshabilitar redimensionamiento manual
                                    '&:focus': {
                                        outline: 'none'
                                    }
                                }
                            }}
                        />
                        
                        {/* ========================================
                            CONTADOR DE CARACTERES DINÁMICO
                            ======================================== */}
                        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                            <Text 
                                variant="small" 
                                styles={{
                                    root: {
                                        fontSize: '11px',
                                        color: isOverLimit ? '#d13438' : isNearLimit ? '#ca5010' : '#605e5c',
                                        fontWeight: isOverLimit || isNearLimit ? '600' : '400'
                                    }
                                }}
                            >
                                {isOverLimit ? 'Límite excedido' : isNearLimit ? 'Casi en el límite' : `${charactersRemaining} caracteres restantes`}
                            </Text>
                            <Text 
                                variant="small" 
                                styles={{
                                    root: {
                                        fontSize: '11px',
                                        color: isOverLimit ? '#d13438' : isNearLimit ? '#ca5010' : '#605e5c',
                                        fontWeight: '600'
                                    }
                                }}
                            >
                                {charactersUsed}/{MAX_CHARACTERS}
                            </Text>
                        </Stack>
                    </Stack>
                    
                    {/* Botón de enviar moderno */}
                    {/* ========================================
                        BOTÓN DE ENVIAR CON VALIDACIÓN
                        ======================================== */}
                    <IconButton
                        iconProps={{ iconName: 'Send' }}
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim() || isOverLimit || busy}  // Deshabilitar si no hay texto, se excede límite o está ocupado
                        ariaLabel="Enviar comentario"
                        role="button"
                        styles={{
                            root: {
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: newCommentText.trim() ? '#0078d4' : '#f3f2f1',
                                color: newCommentText.trim() ? 'white' : '#605e5c',
                                border: 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: newCommentText.trim() ? '#106ebe' : '#e1e5e9',
                                    transform: 'scale(1.05)'
                                },
                                '&:active': {
                                    transform: 'scale(0.95)'
                                }
                            }
                        }}
                    />
                </Stack>
            </Stack>

            {/* Contenido principal */}
            <Stack 
                className="comment-timeline-content"
                styles={{
                    root: {
                        padding: '24px',
                        flex: 1,
                        overflow: 'auto'
                    }
                }}
                tokens={{ childrenGap: 16 }}
            >
                {processedComments.mainComments.length === 0 ? (
                    <Stack 
                        className="empty-state-animate"
                        horizontalAlign="center"
                        verticalAlign="center"
                        styles={{
                            root: {
                                flex: 1,
                                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                borderRadius: '16px',
                                padding: '40px',
                                position: 'relative',
                                overflow: 'hidden'
                            } 
                        }}
                        tokens={{ childrenGap: 20 }}
                    >
                        {/* Elementos decorativos */}
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '-20px',
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.3)',
                            transform: 'rotate(45deg)'
                        }} />
                        
                        <Stack
                            horizontalAlign="center"
                            verticalAlign="center"
                            styles={{
                                root: {
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                                }
                            }}
                    >
                        <Icon 
                            iconName="Comment" 
                            styles={{ 
                                root: { 
                                        fontSize: '36px', 
                                        color: 'white' 
                                } 
                            }} 
                        />
                        </Stack>
                        
                        <Stack tokens={{ childrenGap: 8 }} horizontalAlign="center">
                            <Text 
                                variant="xLarge" 
                                styles={{ 
                                    root: { 
                                        color: '#323130', 
                                        textAlign: 'center',
                                        fontWeight: 600,
                                        fontSize: '20px'
                                    } 
                                }}
                            >
                            No hay comentarios aún
                        </Text>
                            <Text 
                                variant="medium" 
                                styles={{ 
                                    root: { 
                                        color: '#605e5c', 
                                        textAlign: 'center',
                                        fontSize: '14px'
                                    } 
                                }}
                            >
                            ¡Sé el primero en agregar un comentario!
                        </Text>
                        </Stack>
                        {errorText && (
                            <Text
                                variant="small"
                                styles={{ root: { color: '#d13438', marginTop: 4 } }}
                            >
                                {errorText}
                            </Text>
                        )}
                    </Stack>
                ) : (
                    processedComments.mainComments.map((comment, index) => (
                        <Stack key={comment.id} tokens={{ childrenGap: 0 }} className="content-item">
                            <CommentItem comment={comment} />
                            {index < processedComments.mainComments.length - 1 && (
                                <div style={{ 
                                    margin: '20px 0', 
                                    height: '2px', 
                                    background: 'linear-gradient(90deg, transparent 0%, #0078d4 50%, transparent 100%)',
                                    borderRadius: '1px'
                                }} />
                            )}
                        </Stack>
                    ))
                )}
            </Stack>
        </Stack>
    );
});

CommentTimeline.displayName = "CommentTimeline";
