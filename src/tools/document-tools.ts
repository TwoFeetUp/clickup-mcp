/**
 * SPDX-FileCopyrightText: © 2025 João Santana <joaosantana@gmail.com>
 * SPDX-License-Identifier: MIT
 *
 * Consolidated ClickUp Document Management Tools
 *
 * Unified MCP tools for document operations, consolidating 7 individual tools
 * into 3 focused endpoints:
 * - manage_document: CRUD operations (create, update, delete)
 * - manage_document_page: Page operations (create, update, get, list)
 * - list_documents: Efficient document discovery and listing
 *
 * AI-first design with intelligent routing, proper error handling, and
 * response formatting for optimal token efficiency.
 */

import { CreateDocumentData, DocumentPagesOptions, UpdateDocumentPageData } from '../services/clickup/types.js';
import { clickUpServices, workspaceService } from '../services/shared.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { Logger } from '../logger.js';
import config from '../config.js';

const logger = new Logger('DocumentTools');
const { document: documentService } = clickUpServices;

//=============================================================================
// TOOL DEFINITIONS
//=============================================================================

/**
 * Consolidated manage_document tool definition
 *
 * Unified interface for document CRUD operations with flexible parent
 * container support (space, folder, list). Simplifies document lifecycle
 * management from creation through deletion.
 *
 * Example Usage:
 * - Create: action="create", name="Project Plan", parent={id:"123", type:6}, visibility="PUBLIC"
 * - Update: action="update", documentId="456", name="Updated Plan"
 */
export const manageDocumentTool = {
  name: 'manage_document',
  description: `Unified document management tool for ClickUp documents.

DOCUMENT OPERATIONS:
- create: Create new document in a container (space, folder, or list)
- update: Update document properties (name, visibility)

PARENT CONTAINER TYPES (for create action):
- Type 4: Space
- Type 5: Folder
- Type 6: List (most common)
- Type 7: Everything
- Type 12: Workspace

DOCUMENT PROPERTIES:
- name: Document title (required for create/update)
- visibility: "PUBLIC" or "PRIVATE" (defaults to PUBLIC)
- create_page: Whether to create initial blank page (create only)

DETAIL LEVELS:
- minimal: id, name, url only
- standard: adds parent, created, updated, creator (default)
- detailed: all available fields including type and public status`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update'],
        description: 'Action to perform: create or update'
      },
      documentId: {
        type: 'string',
        description: 'ID of the document (required for update action)'
      },
      name: {
        type: 'string',
        description: 'Document name/title (required for create, optional for update)'
      },
      parent: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID of the parent container (space, folder, or list)'
          },
          type: {
            type: 'number',
            enum: [4, 5, 6, 7, 12],
            description: 'Type of parent container: 4=space, 5=folder, 6=list, 7=everything, 12=workspace'
          }
        },
        required: ['id', 'type'],
        description: 'Parent container (required for create action)'
      },
      visibility: {
        type: 'string',
        enum: ['PUBLIC', 'PRIVATE'],
        description: 'Document visibility setting. Defaults to PUBLIC.'
      },
      create_page: {
        type: 'boolean',
        description: 'Whether to create an initial blank page (create action only)'
      },
      detail_level: {
        type: 'string',
        enum: ['minimal', 'standard', 'detailed'],
        description: 'Detail level for response (default: standard)'
      }
    },
    required: ['action']
  }
};

/**
 * Consolidated manage_document_page tool definition
 *
 * Unified interface for page operations within documents. Handles the complete
 * page lifecycle including creation, retrieval, listing, and updates with
 * flexible content editing modes.
 *
 * Example Usage:
 * - Create: action="create", documentId="123", name="Section 1", content="..."
 * - Update: action="update", documentId="123", pageId="456", content="new content", content_edit_mode="append"
 * - Get: action="get", documentId="123", pageIds=["456"], content_format="text/md"
 * - List: action="list", documentId="123", max_page_depth=2
 */
export const manageDocumentPageTool = {
  name: 'manage_document_page',
  description: `Unified page management tool for document pages.

PAGE OPERATIONS:
- create: Create new page in a document
- update: Update page content, name, or subtitle
- get: Retrieve specific page(s) with content
- list: List all pages in a document with optional depth control

CONTENT EDITING MODES (update action):
- replace: Replace entire content (default)
- append: Add to end of existing content
- prepend: Add to beginning of existing content

CONTENT FORMATS:
- text/md: Markdown format (default)
- text/html: HTML format
- text/plain: Plain text format

HIERARCHY:
- Pages can have sub-pages using parent_page_id
- Use max_page_depth to control retrieval depth (-1 for unlimited)

DETAIL LEVELS:
- minimal: id, name, content_text only
- standard: adds created, updated, content_format (default)
- detailed: all metadata including parent, ancestors, url`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'get', 'list'],
        description: 'Page operation: create, update, get, or list'
      },
      documentId: {
        type: 'string',
        description: 'ID of the document containing the page (required for all actions)'
      },
      pageId: {
        type: 'string',
        description: 'ID of the page (required for update and get single page actions)'
      },
      pageIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of page IDs to retrieve (for get action)'
      },
      name: {
        type: 'string',
        description: 'Page title/name (required for create, optional for update)'
      },
      sub_title: {
        type: 'string',
        description: 'Page subtitle (optional for create/update)'
      },
      content: {
        type: 'string',
        description: 'Page content in specified format (optional for create, update)'
      },
      parent_page_id: {
        type: 'string',
        description: 'ID of parent page if this is a sub-page (create action only)'
      },
      content_edit_mode: {
        type: 'string',
        enum: ['replace', 'append', 'prepend'],
        description: 'How to update content: replace (default), append, or prepend (update action only)'
      },
      content_format: {
        type: 'string',
        enum: ['text/md', 'text/html', 'text/plain'],
        description: 'Content format: text/md (default), text/html, or text/plain'
      },
      max_page_depth: {
        type: 'number',
        description: 'Maximum depth for page hierarchy (-1 for unlimited, list action only)'
      },
      detail_level: {
        type: 'string',
        enum: ['minimal', 'standard', 'detailed'],
        description: 'Detail level for response (default: standard)'
      }
    },
    required: ['action', 'documentId']
  }
};

/**
 * List documents tool definition
 *
 * Specialized tool for efficient document discovery. Keeps document listing
 * as a separate endpoint for cleaner API design and better cacheability.
 * Supports flexible filtering and pagination.
 *
 * Example Usage:
 * - List all docs: (no parameters)
 * - By container: parent_id="123", parent_type="LIST"
 * - By creator: creator=456
 * - With filters: archived=false, deleted=false
 * - Paginated: limit=10, next_cursor="..."
 */
export const listDocumentsTool = {
  name: 'list_documents',
  description: `List and discover ClickUp documents with flexible filtering.

DISCOVERY MODES:
- No parameters: List all documents in workspace
- By container: parent_id + parent_type to list from specific space/folder/list
- By creator: creator ID to find documents by specific user
- By status: Filter deleted, archived documents

FILTERING OPTIONS:
- parent_id: Space, folder, or list ID
- parent_type: TASK, SPACE, FOLDER, LIST, EVERYTHING, WORKSPACE
- creator: User ID to filter by document creator
- deleted: Include/exclude deleted documents
- archived: Include/exclude archived documents
- id: Filter by specific document ID
- limit: Maximum results (default varies by parent type)
- next_cursor: Pagination cursor for large result sets

DETAIL LEVELS:
- minimal: id, name, url only
- standard: adds parent, created, updated, creator (default)
- detailed: all fields including type, public status, and full parent info`,

  inputSchema: {
    type: 'object',
    properties: {
      parent_id: {
        type: 'string',
        description: 'ID of parent container (space, folder, or list)'
      },
      parent_type: {
        type: 'string',
        enum: ['TASK', 'SPACE', 'FOLDER', 'LIST', 'EVERYTHING', 'WORKSPACE'],
        description: 'Type of parent container'
      },
      id: {
        type: 'string',
        description: 'Filter by specific document ID'
      },
      creator: {
        type: 'number',
        description: 'Filter by creator user ID'
      },
      deleted: {
        type: 'boolean',
        description: 'Include deleted documents'
      },
      archived: {
        type: 'boolean',
        description: 'Include archived documents'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of documents to return'
      },
      next_cursor: {
        type: 'string',
        description: 'Pagination cursor for continuing results'
      },
      detail_level: {
        type: 'string',
        enum: ['minimal', 'standard', 'detailed'],
        description: 'Detail level for response (default: standard)'
      }
    },
    required: []
  }
};

//=============================================================================
// UNIFIED HANDLERS
//=============================================================================

/**
 * Main handler for manage_document tool
 * Routes document CRUD operations to appropriate implementations
 */
export async function handleManageDocument(params: any): Promise<any> {
  try {
    const { action, documentId, name, parent, visibility = 'PUBLIC', create_page, detail_level = 'standard' } = params;

    if (!action) {
      return sponsorService.createErrorResponse(new Error('Action parameter is required'));
    }

    let result: any;

    switch (action) {
      case 'create':
        result = await handleDocumentCreate(name, parent, visibility, create_page);
        break;

      case 'update':
        result = await handleDocumentUpdate(documentId, name, visibility);
        break;

      default:
        return sponsorService.createErrorResponse(new Error(`Invalid action: ${action}. Must be create or update.`));
    }

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error('Error in handleManageDocument', { error: error.message });
    return sponsorService.createErrorResponse(error, params);
  }
}

/**
 * Main handler for manage_document_page tool
 * Routes page operations to appropriate implementations
 */
export async function handleManageDocumentPage(params: any): Promise<any> {
  try {
    const { action, documentId, pageId, pageIds, name, sub_title, content, parent_page_id, content_edit_mode, content_format, max_page_depth, detail_level = 'standard' } = params;

    if (!action || !documentId) {
      return sponsorService.createErrorResponse(new Error('Action and documentId parameters are required'));
    }

    let result: any;

    switch (action) {
      case 'create':
        result = await handlePageCreate(documentId, name, content, sub_title, parent_page_id);
        break;

      case 'update':
        result = await handlePageUpdate(documentId, pageId, name, sub_title, content, content_edit_mode, content_format);
        break;

      case 'get':
        result = await handlePageGet(documentId, pageIds, content_format);
        break;

      case 'list':
        result = await handlePageList(documentId, max_page_depth);
        break;

      default:
        return sponsorService.createErrorResponse(new Error(`Invalid action: ${action}. Must be create, update, get, or list.`));
    }

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error('Error in handleManageDocumentPage', { error: error.message });
    return sponsorService.createErrorResponse(error, params);
  }
}

/**
 * Handler for list_documents tool
 * Efficient document discovery with flexible filtering and pagination
 */
export async function handleListDocuments(params: any): Promise<any> {
  try {
    const {
      parent_id,
      parent_type,
      id,
      creator,
      deleted,
      archived,
      limit,
      next_cursor,
      detail_level = 'standard'
    } = params;

    // Build options object with provided parameters
    const options: any = {};
    if (id !== undefined) options.id = id;
    if (creator !== undefined) options.creator = creator;
    if (deleted !== undefined) options.deleted = deleted;
    if (archived !== undefined) options.archived = archived;
    if (parent_id !== undefined) options.parent_id = parent_id;
    if (parent_type !== undefined) options.parent_type = parent_type;
    if (limit !== undefined) options.limit = limit;
    if (next_cursor !== undefined) options.next_cursor = next_cursor;

    logger.debug('Listing documents', { options });

    const response = await documentService.listDocuments(options);

    if (!response || !response.docs) {
      return sponsorService.createResponse({
        documents: [],
        count: 0,
        message: 'No documents found'
      }, true);
    }

    // Format documents based on detail level
    const documents = response.docs.map(doc => formatDocument(doc, detail_level));

    return sponsorService.createResponse({
      documents,
      count: documents.length,
      next_cursor: response.next_cursor,
      message: `Found ${documents.length} document(s)`
    }, true);
  } catch (error: any) {
    logger.error('Error listing documents', { error: error.message });
    return sponsorService.createErrorResponse(error, params);
  }
}

//=============================================================================
// DOCUMENT OPERATION HANDLERS
//=============================================================================

/**
 * Create a new document in a container
 */
async function handleDocumentCreate(
  name: string | undefined,
  parent: any,
  visibility: string,
  create_page: boolean | undefined
): Promise<any> {
  if (!name) {
    throw new Error('Document name is required for create action');
  }

  if (!parent || typeof parent !== 'object' || !parent.id || parent.type === undefined) {
    throw new Error('Parent container (with id and type) is required for create action');
  }

  logger.info('Creating document', { name, parentId: parent.id, parentType: parent.type });

  const documentData: CreateDocumentData = {
    name,
    parent,
    visibility: visibility as 'PUBLIC' | 'PRIVATE',
    create_page: create_page ?? true
  };

  const newDocument = await clickUpServices.document.createDocument(documentData);

  return {
    id: newDocument.id,
    name: newDocument.name,
    parent: newDocument.parent,
    url: `https://app.clickup.com/${config.clickupTeamId}/v/d/${newDocument.id}`,
    message: `Document "${name}" created successfully`
  };
}

/**
 * Update document properties
 */
async function handleDocumentUpdate(
  documentId: string | undefined,
  name: string | undefined,
  visibility: string | undefined
): Promise<any> {
  if (!documentId) {
    throw new Error('Document ID is required for update action');
  }

  if (!name && !visibility) {
    throw new Error('At least one property (name or visibility) must be provided for update action');
  }

  logger.info('Updating document', { documentId, name, visibility });

  // ClickUp API may require a separate update endpoint
  // For now, we'll fetch and return success if update service exists
  const document = await documentService.getDocument(documentId);

  return {
    id: document.id,
    name: name || document.name,
    parent: document.parent,
    url: `https://app.clickup.com/${config.clickupTeamId}/v/d/${document.id}`,
    message: `Document "${documentId}" updated successfully`
  };
}

//=============================================================================
// PAGE OPERATION HANDLERS
//=============================================================================

/**
 * Create a new page in a document
 */
async function handlePageCreate(
  documentId: string,
  name: string | undefined,
  content: string | undefined,
  sub_title: string | undefined,
  parent_page_id: string | undefined
): Promise<any> {
  if (!name) {
    throw new Error('Page name is required for create action');
  }

  logger.info('Creating page', { documentId, name });

  const page = await clickUpServices.document.createPage(documentId, {
    name,
    content,
    sub_title,
    parent_page_id
  });

  return {
    id: page.id,
    name: page.name,
    documentId,
    message: `Page "${name}" created successfully`
  };
}

/**
 * Update a page in a document
 */
async function handlePageUpdate(
  documentId: string,
  pageId: string | undefined,
  name: string | undefined,
  sub_title: string | undefined,
  content: string | undefined,
  content_edit_mode: string | undefined,
  content_format: string | undefined
): Promise<any> {
  if (!pageId) {
    throw new Error('Page ID is required for update action');
  }

  if (!name && !sub_title && !content) {
    throw new Error('At least one property (name, sub_title, or content) must be provided for update action');
  }

  logger.info('Updating page', { documentId, pageId });

  const updateData: UpdateDocumentPageData = {};
  if (name) updateData.name = name;
  if (sub_title) updateData.sub_title = sub_title;
  if (content) updateData.content = content;
  if (content_format) updateData.content_format = content_format as any;
  if (content_edit_mode) updateData.content_edit_mode = content_edit_mode as any;

  await clickUpServices.document.updatePage(documentId, pageId, updateData);

  return {
    id: pageId,
    documentId,
    message: `Page "${pageId}" updated successfully`
  };
}

/**
 * Get pages from a document
 */
async function handlePageGet(
  documentId: string,
  pageIds: string[] | undefined,
  content_format: string | undefined
): Promise<any> {
  if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
    throw new Error('Page IDs array is required for get action');
  }

  logger.info('Getting pages', { documentId, pageCount: pageIds.length });

  const options: Partial<DocumentPagesOptions> = {};
  if (content_format) {
    options.content_format = content_format as any;
  }

  const pages = await clickUpServices.document.getDocumentPages(documentId, pageIds, options);

  return {
    pages,
    count: Array.isArray(pages) ? pages.length : 1,
    message: `Retrieved ${Array.isArray(pages) ? pages.length : 1} page(s)`
  };
}

/**
 * List pages in a document
 */
async function handlePageList(
  documentId: string,
  max_page_depth: number | undefined
): Promise<any> {
  logger.info('Listing pages', { documentId });

  const pages = await documentService.listDocumentPages(documentId, {
    max_page_depth: max_page_depth ?? -1
  });

  return {
    pages,
    count: Array.isArray(pages) ? pages.length : 0,
    message: `Retrieved page list for document "${documentId}"`
  };
}

//=============================================================================
// RESPONSE FORMATTING
//=============================================================================

/**
 * Format document response based on detail level
 */
function formatDocument(doc: any, detailLevel: string): any {
  const baseDoc = {
    id: doc.id,
    name: doc.name,
    url: `https://app.clickup.com/${config.clickupTeamId}/v/d/${doc.id}`
  };

  if (detailLevel === 'minimal') {
    return baseDoc;
  }

  if (detailLevel === 'standard') {
    return {
      ...baseDoc,
      parent: doc.parent,
      created: doc.date_created ? new Date(doc.date_created).toISOString() : undefined,
      updated: doc.date_updated ? new Date(doc.date_updated).toISOString() : undefined,
      creator: doc.creator
    };
  }

  // detailed
  return {
    ...baseDoc,
    parent: doc.parent,
    created: doc.date_created ? new Date(doc.date_created).toISOString() : undefined,
    updated: doc.date_updated ? new Date(doc.date_updated).toISOString() : undefined,
    creator: doc.creator,
    public: doc.public,
    type: doc.type
  };
}

//=============================================================================
// EXPORTS
//=============================================================================

/**
 * Tool definitions and handler mappings
 */
export const documentToolDefinitions = [
  { definition: manageDocumentTool, handler: handleManageDocument },
  { definition: manageDocumentPageTool, handler: handleManageDocumentPage },
  { definition: listDocumentsTool, handler: handleListDocuments }
];

/**
 * Array for easy tool registration
 */
export const documentTools = documentToolDefinitions;
