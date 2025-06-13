import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/db"

// GET - Retrieve all cache keys and their data
export async function GET(request: NextRequest) {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // If a specific key is requested
    if (key) {
      const data = await redis.get(`cache:${key}`);
      if (!data) {
        return NextResponse.json(
          { error: `Key '${key}' not found` },
          { status: 404 }
        );
      }
      
      try {
        const parsedData = JSON.parse(data);
        return NextResponse.json({
          key,
          data: parsedData,
          retrieved_at: new Date().toISOString()
        });
      } catch {
        // If data is not JSON, return as string
        return NextResponse.json({
          key,
          data,
          retrieved_at: new Date().toISOString()
        });
      }
    }

    // Get all cache keys
    const keys = await redis.keys('cache:*');
    const caches = [];

    for (const fullKey of keys) {
      const key = fullKey.replace('cache:', '');
      const data = await redis.get(fullKey);
      
      if (data) {
        try {
          const parsedData = JSON.parse(data);
          caches.push({
            key,
            data: parsedData,
            type: 'json'
          });
        } catch {
          caches.push({
            key,
            data,
            type: 'string'
          });
        }
      }
    }

    return NextResponse.json({
      total_keys: caches.length,
      caches,
      retrieved_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error retrieving cache data:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cache data" },
      { status: 500 }
    );
  }
}

// POST - Create/Save a new cache entry
export async function POST(request: NextRequest) {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const body = await request.json();
    const { key, data, ttl } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    if (data === undefined || data === null) {
      return NextResponse.json(
        { error: "Data is required" },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existingData = await redis.get(`cache:${key}`);
    if (existingData) {
      return NextResponse.json(
        { error: `Key '${key}' already exists. Use PUT to update it.` },
        { status: 409 }
      );
    }

    // Store the data as JSON string
    const jsonData = JSON.stringify(data);
    
    if (ttl && typeof ttl === 'number' && ttl > 0) {
      // Set with expiration time (TTL in seconds)
      await redis.setEx(`cache:${key}`, ttl, jsonData);
    } else {
      // Set without expiration
      await redis.set(`cache:${key}`, jsonData);
    }

    return NextResponse.json({
      message: `Cache entry '${key}' created successfully`,
      key,
      data,
      ttl: ttl || null,
      created_at: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating cache entry:", error);
    return NextResponse.json(
      { error: "Failed to create cache entry" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing cache entry
export async function PUT(request: NextRequest) {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const body = await request.json();
    const { key, data, ttl } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    if (data === undefined || data === null) {
      return NextResponse.json(
        { error: "Data is required" },
        { status: 400 }
      );
    }

    // Check if key exists
    const existingData = await redis.get(`cache:${key}`);
    if (!existingData) {
      return NextResponse.json(
        { error: `Key '${key}' not found. Use POST to create it.` },
        { status: 404 }
      );
    }

    // Update the data
    const jsonData = JSON.stringify(data);
    
    if (ttl && typeof ttl === 'number' && ttl > 0) {
      // Update with new expiration time
      await redis.setEx(`cache:${key}`, ttl, jsonData);
    } else {
      // Update without changing expiration (or remove expiration if no TTL provided)
      await redis.set(`cache:${key}`, jsonData);
    }

    return NextResponse.json({
      message: `Cache entry '${key}' updated successfully`,
      key,
      data,
      ttl: ttl || null,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error updating cache entry:", error);
    return NextResponse.json(
      { error: "Failed to update cache entry" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a cache entry
export async function DELETE(request: NextRequest) {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: "Key parameter is required" },
        { status: 400 }
      );
    }

    // Check if key exists
    const existingData = await redis.get(`cache:${key}`);
    if (!existingData) {
      return NextResponse.json(
        { error: `Key '${key}' not found` },
        { status: 404 }
      );
    }

    // Delete the key
    const deleted = await redis.del(`cache:${key}`);
    
    if (deleted === 1) {
      return NextResponse.json({
        message: `Cache entry '${key}' deleted successfully`,
        key,
        deleted_at: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { error: `Failed to delete key '${key}'` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error deleting cache entry:", error);
    return NextResponse.json(
      { error: "Failed to delete cache entry" },
      { status: 500 }
    );
  }
} 