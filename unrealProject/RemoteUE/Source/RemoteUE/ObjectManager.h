#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "IWebSocket.h"
#include "ObjectManager.generated.h"

class AActor;
class UMaterialInterface;
class UStaticMesh;

UCLASS()
class REMOTEUE_API AObjectManager : public AActor
{
	GENERATED_BODY()

public:
	AObjectManager();

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	// Opens and maintains the Unreal to backend WebSocket connection.
	void ConnectWebSocket();
	// Entry point for backend events like create, update and delete operations.
	void HandleWebSocketMessage(const FString& Message);

	// Event handlers for create, update and delete operations.
	void HandleObjectCreated(const TSharedPtr<FJsonObject>& ObjectData);
	void HandleObjectUpdated(const TSharedPtr<FJsonObject>& ObjectData);
	void HandleObjectDeleted(const TSharedPtr<FJsonObject>& ObjectData);

	// Spawns a new actor or replaces an existing one with the same id.
	AActor* SpawnOrReplaceActor(const FString& Id, const FString& Shape, const FLinearColor& Color, float Size);
	// Applies mesh/material/scale changes to an existing actor.
	void ApplyActorVisuals(AActor* Actor, const FString& Shape, const FLinearColor& Color, float Size);
	// Loads the static mesh based on the shape selected from the frontend.
	UStaticMesh* GetMeshForShape(const FString& Shape) const;
	// Parses the color field from the JSON object.
	FLinearColor ParseColorField(const TSharedPtr<FJsonObject>& ObjectData) const;
	// Converts color presets like "red" to FLinearColor.
	static FLinearColor ColorFromPreset(const FString& Preset);

private:
	// Map of object ids to their actors.
	UPROPERTY()
	TMap<FString, AActor*> ObjectMap;

	// WebSocket connection to the backend.
	TSharedPtr<IWebSocket> WebSocket;

	// Base material for all objects.
	UPROPERTY()
	TObjectPtr<UMaterialInterface> BaseMaterial;
};
